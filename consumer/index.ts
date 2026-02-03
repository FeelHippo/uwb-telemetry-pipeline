import * as broker from 'mqtt';

(() => {
  const clientId = 'tvId-consumer';
  const client = broker.connect({
    host: 'test.mosquitto.org',
    port: 1883,
    clientId,
  });
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
