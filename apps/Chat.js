import * as Utils from './../server/Utils.js'
import App from './App.js';

export default class Chat extends App {
    constructor(user, app, ws, defaultParams){
        super(user, app, ws, defaultParams);
        this._name = 'chat';
    }
    
    render(req, res){
        return res.render('apps/chat', this._mergeParams({
            user : this.user,
            chan : Utils.getChan(this.user, this._name),
            app  : this._name
        }));
    }


    sendMessage(data){
        
    }
}