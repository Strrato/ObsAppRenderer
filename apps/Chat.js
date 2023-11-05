export default class Chat {
    constructor(user, app, defaultParams){
        this.user = user;
        this.app = app;
        this.defaultParams = defaultParams;
    }

    render(req, res){
        return res.render('apps/chat', this._mergeParams({
            user : this.user
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