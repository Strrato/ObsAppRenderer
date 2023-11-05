import * as readline from "readline";
import Db from "./server/Db.js";
import axios from "axios";

const db = new Db();

const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const commandList = {
    addUser : addUser,
    testMessage : testMessage,
};

function defined(variable){
    return typeof variable !== typeof void(0);
}

async function askAsync(question){
    return await new Promise(resolve => {
        reader.question(`${question}  \n`, res => {
            resolve(res);
        });
    }) ;

}

async function askCommand(){

    let list = [];

    for(let command in commandList){
        list.push(command);
    }

    reader.question(`Commande ? [${list.join(' ')}]  \n`, async res => {
        if (defined(commandList[res])) {
            return await commandList[res]();
        }
        console.log('Invalid command');
        return askCommand();
    });
}

async function addUser(){
    let username = await askAsync('Username ?');
    let password = await askAsync('Password ?');
    let scopes = await askAsync('Scopes ?');

    scopes = scopes ? scopes.split(' ') : [];

    if (username && password){
        if (db.addUser(username, password, scopes) === false){
            console.error('Error in adding user attempt');
        }else {
            console.log(`User ${username} added succesfully`);
        }
    }
    
    return askCommand();   
}

async function testMessage(){
    let message = await askAsync('Message ?');
    axios.post('http://localhost:4242/simulate', {
        message : message
    }).then(res => {
        console.log(res);
    });

    return askCommand();
}

askCommand();