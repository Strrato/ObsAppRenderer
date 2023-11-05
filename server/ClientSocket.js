import * as Utils from './Utils.js'
import { WebSocketServer } from 'ws';

export class ClientSocket{
    constructor(){
        /** @type {WebSocketServer[]} */
        this.wss = {};
        this.connexions = [];
    }

    openSocket(name, user){
        const chan = Utils.getChan(user, name);
        if (!Utils.defined(this.wss[chan])){
            this.wss[chan] = new WebSocketServer({
                noServer: true
            });
            console.log('socket created', chan);
            this.handleEvents(chan);
        }
    }

    closeSocket(name, user){
        const chan = Utils.getChan(user, name);
        if (Utils.defined(this.wss[chan])){
            this.wss[chan].close();
            delete this.wss[chan];
        }
    }

    handleEvents(chan){
        if (Utils.defined(this.wss[chan])){
            this.wss[chan].on('connection', ws => {
                this.wss[chan].on('error', console.error);
                this.connexions.push(ws);
                console.log('connection on socket', chan);
            });
        }
    }

    handleUpgrade(chan, request, socket, head){
        let vm = this;
        if (Utils.defined(this.wss[chan])){
            this.wss[chan].handleUpgrade(request, socket, head, function done(ws) {
                console.log('connection url', request.url);
                vm.wss[chan].emit('connection', ws, request);
            });
        }
    }

    sendToAll(data){
        for(let chan in this.wss){
            let ws = this.wss[chan];
            ws.clients.forEach(function each(client) {
                if (client.readyState === 1) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    }

    sendToApp(app, data, user){
        const chan = Utils.getChan(user, app);
        console.log('sending to channel', chan);
        if (Utils.defined(this.wss[chan])){
            this.wss[chan].clients.forEach(function each(client) {
                console.log(client.readyState);
                if (client.readyState === 1) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    }

    close(){
        this.ws.close();
        this.ws = null;
    }

    _getChan(user, chan){
        return chan + '/' + btoa(user.id).replace(/==$/, '');
    }

}