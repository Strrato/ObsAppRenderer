import * as Utils from './../server/Utils.js'

export default class Chat {
    constructor(user, app, defaultParams){
        this.user = user;
        this.app = app;
        this.defaultParams = defaultParams;
    }

    render(req, res){
        return res.render('apps/chat', this._mergeParams({
            user : this.user,
            chan : Utils.getChan(this.user, 'chat')
        }));
    }

    sendMessage(data){
        
    }

    _mergeParams(params){
        return {
            ...this.defaultParams,
            ...params
        };
    }
}