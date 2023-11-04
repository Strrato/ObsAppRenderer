import { WebSocketServer } from 'ws';
import express from 'express'; 
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv'
dotenv.config()

export class ClientServer {
    constructor() {
        this.httpServer = null;
        this.wsServer = null;
        this.connexions = [];
        this.ready = false;
        this.app = express();
        this.users = [];
        this.appList = process.env.APP_LIST.split(' ');
    }
    start(port){
        if (this.httpServer === null) {
            //this.app.use("/render", express.static(path.resolve("./render")));
            this.app.use(cors({
                origin: '*'
            }));
            
            this.httpServer = this.app.listen(port, () => {
                console.log(`Server listen on ${port}`);
                this.ready = true;
            });

            this.app.get('/', (req, res) => {
                
            });

            this.app.get('/render/:id/:app', (req, res) => {
                let id = this._satanize(req.params.id);
                let app = this._satanize(req.params.app);

                if (!this._isValidApp(app)){
                    res.status(401).send('UNAUTHORIZED');
                    return;
                }


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
                    message: message.content,
                    messageId: message.id,
                    isAction: message.isAction,
                    isModerator: message.isModerator,
                    name: user.name,
                    avatar: user.avatar,
                    userid: user.id,
                    badges: user.badges,
                    color: user.color,
                };

                client.send(data);
            }
        });
        
    }

    _satanize(input) {
        return input.replace(/[^A-z0-9_:\-àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ]/g, '');
    }

    _isValidApp(appName){
        return this.appList.indexOf(appName.toLowerCase()) > -1;
    }

};