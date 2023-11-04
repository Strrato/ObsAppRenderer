import { WebSocketServer } from 'ws';
import express from 'express'; 
import session from 'express-session'
import flash from 'express-flash';
import rateLimit from 'express-rate-limit';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv'
import passport from "passport";
import LocalStrategy from 'passport-local';
import Tables from "./Tables.js";
import Db from "./Db.js";
import * as Utils from './Utils.js'
import bodyParser from 'body-parser';

dotenv.config()

export class ClientServer {
    constructor() {
        this.httpServer = null;
        this.wsServer = null;
        this.connexions = [];
        this.ready = false;
        this.app = express();
        this.appList = process.env.APP_LIST.split(' ');
        this.db = new Db();
        this.user = null;
        this.rateLimite = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            limit: 10, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
            standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
        });

        passport.use(new LocalStrategy({
            usernameField : Tables.users.fields.username,
            passwordField : Tables.users.fields.password
        }, (username, password, done) => {
            const user = this.db.authUser(username, password);
            if (!user){
                return done(null, false, { message : 'User invalid' });
            }
            return done(null, user);
        }));

        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        passport.deserializeUser((id, done) => {
            const user = this.db.getUserById(id);
            done(null, user);
        });

    }
    start(port){
        if (this.httpServer === null) {

            this._configureApp();
            
            this.httpServer = this.app.listen(port, () => {
                console.log(`Server listen on ${port}`);
                this.ready = true;
            });

            this.wsServer = new WebSocketServer({
                noServer: true
            });

            this.wsServer.on('connection', ws => {
                ws.on('error', console.error);
                this.connexions.push(ws);
            });

            let vm = this;

            this.httpServer.on('upgrade', async function upgrade(request, socket, head) {
                vm.wsServer.handleUpgrade(request, socket, head, function done(ws) {
                    vm.wsServer.emit('connection', ws, request);
                });
            });

            this._registerRoutes();
        }
    }

    stop(){
        if (this.httpServer !== null) {
            this.httpServer.close();
            this.httpServer = null;
        }
        if (this.wsServer !== null) {
            this.wsServer.close();
            this.wsServer = null;
        }
        this.ready = false;
    }

    onReady(){
        return new Promise((resolve, reject) => {
            let checkInt = null;
            checkInt = setInterval(() => {
                if (this.ready){
                    clearInterval(checkInt);
                    resolve();
                }
            }, 100);
        });
    }

    sendMessage(message, user){
        this.wsServer.clients.forEach(function each(client) {
            if (client.readyState === WebSocketServer.OPEN) {
                let data = {
                    message    : message.content,
                    messageId  : message.id,
                    isAction   : message.isAction,
                    isModerator: message.isModerator,
                    name       : user.name,
                    avatar     : user.avatar,
                    userid     : user.id,
                    badges     : user.badges,
                    color      : user.color,
                };

                client.send(data);
            }
        });
        
    }
    _configureApp(){
        this.app.use(cors({
            origin: '*'
        }));

        this.app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false
        }));

        this.app.use(bodyParser.json());
        this.app.use(express.urlencoded({ extended: true })); 
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use(flash());
        this.app.use(express.static(path.resolve('./assets/css')));
        this.app.use(express.static(path.resolve('./assets/meta')));

        this.app.set('views', [path.resolve("./assets/views"), path.resolve("./apps")]);
        this.app.set('view engine', 'pug');

    }
    _registerRoutes(){
        this.app.get('/', (req, res) => {
            if (!req.isAuthenticated()){
                res.redirect('/login');
            }else {
                res.redirect('/render/default');
            }
        });

        this.app.get('/login',  (req, res) => {
            const hasError = Utils.defined(req.query.failed) && req.query.failed == 1;
            res.render('login', this._tplParams({ 
                error : hasError,
                loginField : Tables.users.fields.username,
                passField : Tables.users.fields.password,
            }));
        });

        this.app.post('/login', this.rateLimite, passport.authenticate('local', {
            successRedirect: '/render/default',
            failureRedirect: '/login?failed=1',
            failureFlash: true
        }));

        this.app.get('/render/:app', this._authenticated, (req, res) => {
            this._handleReq(req);
            let app = Utils.satanize(req.params.app);

            if (!app || app === 'default'){
                
                let params = {
                    list : this.appList,
                    errors : []
                };
                
                if (Utils.defined(req.query.notfound) && req.query.notfound == 1){
                    params.errors.push('Unkown app');
                }

                res.render('apps', this._tplParams(params));
                return;
            }

            if (!this._isValidApp(app)){
                res.redirect('/render/default?notfound=1')
                return;
            }


        });
    }

    _isValidApp(appName){
        return this.appList.indexOf(appName.toLowerCase()) > -1;
    }

    _authenticated(req, res, next){
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/login');
    }

    _handleReq(req){
        this.user = req.user;
    }

    _tplParams(params){
        params = params || {};
        const defaultParams = {
            title   : 'Obs App renderer',
            user    : this.user,
            appTitle: 'Obs App renderer',
            mode    : 'admin'
        };
        return {
            ...defaultParams,
            ...params
        };
    }

};