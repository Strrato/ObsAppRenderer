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
import JwtStrategy from 'passport-jwt';
import Tables from "./Tables.js";
import Db from "./Db.js";
import * as Utils from './Utils.js'
import bodyParser from 'body-parser';
import * as Apps from './Apps.js'
import Database from 'better-sqlite3';
import StoreFactory from 'better-sqlite3-session-store';
import { ClientSocket } from './ClientSocket.js';
const SqliteStore = StoreFactory(session);

dotenv.config()

let dbPath = path.resolve(process.env.DB_LOCATION);
Utils.mkdir(dbPath);
const sessionsDB = new Database(path.resolve(`${dbPath}/sessions.db`));

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
        this.mode = null;
        this.clientSocket = null;
        this.http = {
            host : null,
            protocol: null
        };
        this.rateLimite = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            limit: 10, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
            standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
            legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
        });

        this.debug = process.env.APP_ENV.indexOf('debug') > -1;

        passport.use('local-user', new LocalStrategy({
            usernameField : Tables.users.fields.username,
            passwordField : Tables.users.fields.password
        }, (username, password, done) => {
            const user = this.db.authUser(username, password);
            if (!user){
                return done(null, false, { message : 'User invalid' });
            }
            return done(null, user);
        }));

        passport.use('local-jwt', new JwtStrategy.Strategy({
            secretOrKey : process.env.TOKEN_SECRET,
            jwtFromRequest : (req) => {
                return req.params.token;
            }
        }, (data, done) => {
            const user = this.db.getUserById(data.userId);
            if (!user){
                return done(null, false, { message : 'Invalid token, login again to refresh' });
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
            

            this.clientSocket = new ClientSocket();
            
            this.clientSocket.openSocket('global');

            let vm = this;

            this.httpServer.on('upgrade', async function upgrade(request, socket, head) {
                vm.clientSocket.handleUpgrade(request.url.substr(1), request, socket, head);
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
            this.clientSocket.close();
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

    sendMessage(data){
        this.clientSocket.sendToAll(data);
    }

    sendToApp(app, data){
        this.clientSocket.sendToApp(app, data, this.user);
    }
    
    _configureApp(){
        this.app.use(cors({
            origin: '*'
        }));

        this.app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store : new SqliteStore({
                client: sessionsDB
            })
        }));

        this.app.use(bodyParser.json());
        this.app.use(express.urlencoded({ extended: true })); 
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use(flash());
        this.app.use(express.static(path.resolve('./assets/css')));
        this.app.use(express.static(path.resolve('./assets/meta')));
        this.app.use('/fonts', express.static(path.resolve('./assets/fonts')));

        this.app.use((req, res, next) => {
            if (Utils.defined(req.user)){
                this.user = req.user;
            }
            this.mode = req.query.mode ? Utils.satanize(req.query.mode) : 'stream';
            this.http.host = req.headers.host;
            this.http.protocol = req.protocol;
            next();
        });

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
                mode : 'normal'
            }));
        });

        this.app.get('/logout',  (req, res) => {
            req.logout(err => {
                if (err) { return next(err); }
                this.user = null;
                res.redirect('/');
            });
        });

        this.app.post('/login', this.rateLimite, passport.authenticate('local-user', {
            successRedirect: '/render/default?mode=normal',
            failureRedirect: '/login?failed=1',
            failureFlash: true
        }));

        this.app.get('/render/:app', this._authenticated, (req, res) => {

            let app = Utils.satanize(req.params.app);
            let mode = req.query.mode ? Utils.satanize(req.query.mode) : 'stream';

            if (!app || app === 'default'){
                
                let params = {
                    errors : []
                };
                
                if (Utils.defined(req.query.notfound) && req.query.notfound == 1){
                    params.errors.push('Unkown app');
                }

                res.render('apps', this._tplParams(params));
                return;
            }

            if (!this._isValidApp(app)){
                res.redirect(`/render/default?notfound=1&mode=${this.mode}`)
                return;
            }
            console.log('renering', app);
            return this._renderApp(app, req, res);
        });

        this.app.get('/obs/:app/:token',passport.authenticate('local-jwt'), (req, res) => {
            let app = Utils.satanize(req.params.app);
            /*
            passport.authenticate('local-jwt', (err, user, info) => {
                console.log(err);
                if (err) {
                    return next(err);
                }
                if (!user){
                    return res.redirect('/login');
                }
            });*/
            return res.redirect(`/render/${app}`);
        });

        if (this.debug){
            this.app.post('/simulate/:app/:user', (req, res) => {
                let app = Utils.satanize(req.params.app);
                this.user = this.db.getUserByName(Utils.satanize(req.params.user));
                
                let message = req.body.message;
                let author = {
                    id : 42,
                    name : 'DebugMan',
                    avatar : 'https://static-cdn.jtvnw.net/jtv_user_pictures/cd4b811a-0045-4ce0-bb50-271288cb0280-profile_image-300x300.png',
                    badges : [
                        {
                            type : 'artist',
                            url : 'https://assets.help.twitch.tv/article/img/000002399-05.png'
                        },
                        {
                            type : 'vip',
                            url : 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3'
                        }
                    ],
                    color : '#ff00ff'
                };

                this.sendToApp(app, {
                    type   : 'message',
                    message: message,
                    author : author,
                    source : 'twitch'
                });

                this.sendToApp(app, {
                    type : 'image',
                    id : 42,
                    url : 'https://static-cdn.jtvnw.net/jtv_user_pictures/cd4b811a-0045-4ce0-bb50-271288cb0280-profile_image-300x300.png',
                    source : 'twitch'
                });

                res.status(200).send('Ok');
            });
        }
        
    }

    _isValidApp(appName){
        return this.appList.indexOf(appName.toLowerCase()) > -1 && this.user && this.user.scopes.indexOf(appName.toLowerCase()) > -1;
    }

    _authenticated(req, res, next){
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/login');
    }

    _isAdmin(){
        return this.user && this.user.scopes.indexOf('admin') > -1;
    }

    _tplParams(params){
        params = params || {};
        const defaultParams = {
            title   : 'Obs App renderer',
            appTitle: 'Obs App renderer',
            user    : this.user,
            mode    : this.mode,
            host    : this.http.host,
            protocol: this.http.protocol,
            appList : this.appList,
            Utils   : Utils,
            isAdmin : this._isAdmin()
        };
        return {
            ...defaultParams,
            ...params
        };
    }

    _renderApp(app, req, res){
        try{
            this.clientSocket.openSocket(app, this.user);
            return Apps.getApp(app, this.user, this.app, this._tplParams()).render(req, res);
        }catch(e){
            console.error(e);
            return res.redirect(`/render/default?notfound=1&mode=${this.mode}`);
        }
    }

};