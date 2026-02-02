import * as broker from 'mqtt';

(() => {
  const client = broker.connect({
    host: 'localhost',
    port: 1883,
    clientId: 'tvId-consumer',
  });
  console.log('Connection established successfully!', client.connected);
  client.on('connect', () => {
    console.log('Connection established successfully!');
    client.subscribe('symera/telemetry/#', (err) => {
      if (!err) {
        client.publish('symera/telemetry', 'Consumer Available');
      }
    });
  });
})();
