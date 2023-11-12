import * as Utils from './../server/Utils.js'
import { ClientSocket } from '../server/ClientSocket.js';

export default class App {
    constructor(user, app, ws, defaultParams){
        this.user = user;
        this.app = app;
        /** @type {ClientSocket}  */
        this.ws = ws;
        this.defaultParams = defaultParams;
        this._name = 'Set this._name in child constructor';
    }

    get appName(){
        return this._name;
    }

    render(req, res){
        throw new Error('Method "render" is required in override');
    }

    _mergeParams(params){
        return {
            ...this.defaultParams,
            ...params
        };
    }

    _getSocket(){
        return this.ws.getSocket(name, user)
    }
}