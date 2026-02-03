import * as broker from 'mqtt';
import { randomUUID } from 'node:crypto';

const tvChannels = [
  'ABC',
  'CBS',
  'NBC',
  'Fox',
  'The CW',
  'PBS',
  'HBO',
  'FX',
  'AMC',
  'Netflix',
  'Hulu',
  'Disney Channel',
  'Nickelodeon',
  'Cartoon Network',
  'Adult Swim',
  'TNT',
  'TBS',
  'Discovery Channel',
  'History Channel',
  'Food Network',
  'HGTV',
  'Lifetime',
  'Syfy',
  'E!',
  'Bravo',
  'MTV',
  'ESPN',
];
const randomTvChannel = () =>
  tvChannels[Math.floor(Math.random() * tvChannels.length)];
const randomNumberBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const formatTopic = (tvId: string, dongleId: string) =>
  `symera/telemetry/${tvId}/${dongleId}`;
const formatMessage = (
  dongleId: string,
  tvId: string,
  userPseudoId: string,
  channelId: string,
  distanceCm: number,
  rssi: number,
  seq: number,
) =>
  JSON.stringify({
    ts: new Date().toISOString(),
    dongleId,
    tvId,
    userPseudoId,
    channelId,
    distanceCm,
    rssi, // https://en.wikipedia.org/wiki/Received_signal_strength_indicator
    seq,
  });

const mqttBroker = (id: number) => {
  let seq = 0;
  const tvId = `tv-00${id}`;
  const dongleId = `dng-${randomNumberBetween(1, 100)}`;
  const client = broker.connect({
    host: 'test.mosquitto.org',
    port: 1883,
    clientId: tvId,
  });
  client.on('connect', () => {
    console.log(
      `
    Connection established successfully!
    tvId: ${tvId},
    dongleId: ${dongleId}\n\n\
    `,
    );
    if (client.connected === true) {
      setInterval(
        () =>
          client.publish(
            formatTopic(tvId, dongleId),
            formatMessage(
              dongleId,
              tvId,
              randomUUID.toString(),
              randomTvChannel(),
              randomNumberBetween(1, 300),
              randomNumberBetween(-30, -100),
              seq++,
            ),
          ),
        500,
      );
    }
  });
};

[...Array(5)].forEach((_, index) => mqttBroker(index + 1));
