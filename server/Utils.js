import { existsSync, mkdirSync } from 'node:fs';
import { Buffer } from 'buffer'
import * as dotenv from 'dotenv'
dotenv.config();

function btoa(payload){
    return Buffer.from(payload).toString('base64');
}

function atob(bstring){
    return Buffer.from(bstring, 'base64').toString('utf8');
}

export function satanize(input) {
    return input.replace(/[^A-z0-9_:\-àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ]/g, '');
}

export function defined(variable) {
    return typeof variable !== typeof void(0);
}

export function mkdir(path) {
    if (!existsSync(path)){
        mkdirSync(path, { recursive: true });
    }
}

export function getChan(user, name) {
    let payload = user ? user.id : '';
    let id = payload ? btoa(process.env.SALT_WS + ':::' + payload).replace(/=$/, '') : '';
    return name + '/' + id;
}

export function chanToId(chan) {
    let chanContent = chan.replace(/.*\//, '') + '=';
    return chanContent ? atob(cchanContent).replace(/^.*:::/, '') : false;
}

