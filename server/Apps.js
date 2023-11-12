import Chat from '../apps/Chat.js'

const mapping = {
    chat : Chat,
}

export function getApp(name, user, app, ws, defaultParams){
    return new mapping[name](user, app, ws, defaultParams);
};