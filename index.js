///      ॐ 卐 ॐ      ॐ 卐 ॐ      ॐ 卐 ॐ      श्री गणेश      ॐ 卐 ॐ      ॐ 卐 ॐ      ॐ 卐 ॐ      ///
//  श्री श्याम देवाय नमः//

import { createServer } from 'http';
import { config } from 'dotenv';
import app from './app.js';
import { Server } from 'socket.io';


config()


const server = createServer(app)
const port = process.env.APPID || process.env.PORT


const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});
 
// WebSocket Connection Handling
io.on('connection', (socket) => {
    // console.log("Client connected: ${socket.id}");
 
    socket.on('subscribe', (data) => {
        // console.log("Subscribed to channel: ${data.channel}");
    });
 
    socket.on('disconnect', () => {
        // console.log("Client disconnected: ${socket.id}");
    });
});
 
// Pass io instance to MQTT service
// firebaseClient(io);


try {
    server.listen(port, (err) => {
        if (err) {
            console.log(err);
        }
        console.log(`श्री गणेश Server running on port ${port}`);
    })
} catch (error) {
    console.log(error)

}

