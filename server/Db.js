import fs from 'fs'
import path from 'path';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv'
import * as bcrypt from 'bcrypt'
import * as Utils from './Utils.js'
import Tables from "./Tables.js";
dotenv.config()

const USER_TEMPLATE = {
    id : 0,
    username : null,
    password : null,
    scopes : []
};

export default class Db {
    constructor(){
        let dbParams = {};

        if (process.env.APP_ENV == 'debug'){
            dbParams.verbose = console.log;
        }

        this.db = new Database(path.resolve(`./assets/db/${process.env.DB_NAME}`), dbParams);
        this.create();
    }

    create(){
        let def = `
            (
                ${Tables.users.fields.id} INTEGER PRIMARY KEY AUTOINCREMENT,
                ${Tables.users.fields.username} TEXT NOT NULL,
                ${Tables.users.fields.password} TEXT NOT NULL,
                ${Tables.users.fields.salt} TEXT NOT NULL,
                ${Tables.users.fields.scopes} TEXT
            )
        `;

        let sql = `CREATE TABLE IF NOT EXISTS ${Tables.users.name} ${def}`;

        this.db.exec(sql);
    }

    rowToUser(row, full){
        if (!row){
            return false;
        }
        full = full === true;
        console.log(row);
        let user = Object.assign({}, USER_TEMPLATE);
        let scopes = row[Tables.users.fields.scopes];
        user.id = row[Tables.users.fields.id];
        user.username = row[Tables.users.fields.username];
        user.scopes = scopes ? scopes.split(' ') : [];
        if (full){
            user.password = row[Tables.users.fields.password];
            user.salt = row[Tables.users.fields.salt];
        }

        return user;
    }

    getUserById(id){
        let sql = `SELECT * FROM ${Tables.users.name} WHERE ${Tables.users.fields.id} = ?`;
        let stmt = this.db.prepare(sql);
        let row = stmt.get(id);
        return this.rowToUser(row);
    }

    authUser(username, password){
        try {
            const user = this.getUserByName(username, true);
    
            if (!user || !this._checkPassword(password, user.password)){
                return false;
            }
    
            return user;
        }catch(e){
            console.error(e);
            return false;
        }
    }

    getUserByName(username, full){
        full = full === true;
        let sql = `SELECT * FROM ${Tables.users.name} WHERE ${Tables.users.fields.username} = ?`;
        let stmt = this.db.prepare(sql);
        let row = stmt.get(Utils.satanize(username));
        return this.rowToUser(row, full);
    }

    addUser(username, password, scopes){
        try {
            if (this.getUserByName(username) !== false){
                throw new Error("Username already exists");
            }

            let sql = `INSERT INTO ${Tables.users.name} (${Tables.users.fields.username}, ${Tables.users.fields.password}, ${Tables.users.fields.salt}, ${Tables.users.fields.scopes}) VALUES (?,?,?,?)`;
            let dbScopes = scopes.join(' ');
            let salt = this._genSalt();
            let hashPass = this._hashPassword(password, salt);
            let stmt = this.db.prepare(sql);
            let res = stmt.run(Utils.satanize(username), hashPass, salt, dbScopes);

            let id = res.lastInsertRowid;

            return this.getUserById(id);
        }catch(e){
            console.error(e);
            return false;
        }
    }

    _hashPassword(password, salt){
        return bcrypt.hashSync(password, salt);
    }

    _checkPassword(plain, hash){
        return bcrypt.compareSync(plain, hash);
    }

    _genSalt(){
        return bcrypt.genSaltSync(parseInt(process.env.SALT_LENGTH));
    }
}
