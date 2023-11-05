import fs from 'fs'
import path from 'path';
import Database from 'better-sqlite3';
import * as dotenv from 'dotenv'
import * as bcrypt from 'bcrypt'
import * as Utils from './Utils.js'
import Tables from "./Tables.js";
import jsonwebtoken from 'jsonwebtoken'

dotenv.config()

const USER_TEMPLATE = {
    id : 0,
    username : null,
    password : null,
    scopes : [],
    token : null
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
                ${Tables.users.fields.scopes} TEXT,
                ${Tables.users.fields.token} TEXT
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
        let user          = Object.assign({}, USER_TEMPLATE);
        let scopes        = row[Tables.users.fields.scopes];
        user.id       = row[Tables.users.fields.id];
        user.username = row[Tables.users.fields.username];
        user.token    = row[Tables.users.fields.token];
        user.scopes   = scopes ? scopes.split(' ') : [];
        if (full){
            user.password = row[Tables.users.fields.password];
            user.salt     = row[Tables.users.fields.salt];
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

            if (user.token){
                try {
                    jsonwebtoken.verify(user.token, process.env.TOKEN_SECRET);
                }catch(e){
                    this.setToken(user);
                }
            }else{
                this.setToken(user);
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

    updateUser(user){
        try {
            let sql = `UPDATE ${Tables.users.name} SET ${Tables.users.fields.scopes} = ?, ${Tables.users.fields.token} = ? WHERE ${Tables.users.fields.id} = ?`;
            let stmt = this.db.prepare(sql);
            let dbScopes = user.scopes.join(' ');
            let res = stmt.run(dbScopes, user.token, user.id);
            return res.changes > 0;
        }catch(e){
            console.error(e);
            return false;
        }
    }

    updatePassword(user, plainPassword){
        try {
            let sql = `UPDATE ${Tables.users.name} SET ${Tables.users.fields.password} = ?, ${Tables.users.fields.salt} = ? WHERE ${Tables.users.fields.id} = ?`;
            let stmt = this.db.prepare(sql);

            let salt = this._genSalt();
            let hashPass = this._hashPassword(plainPassword, salt);

            let res = stmt.run(hashPass, salt, user.id);

            return res.changes > 0 && this.unsetToken(user);
        }catch(e){
            console.error(e);
            return false;
        }
    }

    setToken(user){
        try {
            let sql = `UPDATE ${Tables.users.name} SET ${Tables.users.fields.token} = ? WHERE ${Tables.users.fields.id} = ?`;
            let stmt = this.db.prepare(sql);

            let res = stmt.run(this._genToken(user), user.id);
            return res.changes > 0;
        }catch(e){
            console.error(e);
            return false;
        }
    }

    unsetToken(user){
        try {
            let sql = `UPDATE ${Tables.users.name} SET ${Tables.users.fields.token} = ? WHERE ${Tables.users.fields.id} = ?`;
            let stmt = this.db.prepare(sql);

            let res = stmt.run(null, user.id);
            return res.changes > 0;
        }catch(e){
            console.error(e);
            return false;
        }
    }

    async checkToken(token){
        return await new Promise(resolve => {
            jsonwebtoken.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
                if (err){
                    console.error(err);
                    resolve(err.message);
                }else {
                    return this.getUserById(decoded.userId);
                }
            });
        });
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

    _genToken(user){
        return jsonwebtoken.sign({ userId: user.id }, process.env.TOKEN_SECRET, { expiresIn : '7d' })
    }
    

}
