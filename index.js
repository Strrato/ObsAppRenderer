import { ClientServer } from './server/ClientServer.js';
import { WebSocketServer } from 'ws';
import 'dotenv/config';

const cServer = new ClientServer();

cServer.start(4242);


const accessToken = '[access token]';
const url = `wss://chat.api.restream.io/ws?accessToken=${accessToken}`;
//const connection = new WebSocketServer(url);
