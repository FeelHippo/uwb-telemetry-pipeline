"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const broker = require("mqtt");
(() => {
    const clientId = 'tvId-consumer';
    const client = broker.connect({
        host: 'localhost',
        port: 1883,
        clientId,
    });
    console.log('Connection established successfully!', client.connected);
    client.on('connect', () => {
        console.log('Connection established successfully!');
        client.subscribe('symera/telemetry/#', (err) => {
            if (err) {
                client.end();
                throw new Error();
            }
            client.publish(`symera/telemetry/${clientId}`, 'Consumer Available');
        });
    });
    client.on('message', (topic, message) => {
        // message is Buffer
        console.log(message.toString());
        client.end();
    });
})();
