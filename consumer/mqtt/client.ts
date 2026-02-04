import { ValidationResult } from 'joi';
import { randomUUID } from 'node:crypto';
import * as broker from 'mqtt';
import influxClient from '../db/influx';
import { message_schema } from '../validators/message';
import { Message } from '../interfaces/message';
import { Point } from '@influxdata/influxdb-client';

export const org = 'Filippo';
export const bucket = 'uwb_telemetry_db';

const writeClient = influxClient.getWriteApi(org, bucket, 'ns');

export default (() => {
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
      client.publish(
        `symera/telemetry/${clientId}`,
        '{ "message": "Consumer Available" }',
      );
    });
  });

  client.on('message', async (topic, message) => {
    const { value, error }: ValidationResult<Message> = message_schema.validate(
      JSON.parse(message.toString()),
    );
    if (error) {
      console.log({ error });
      return;
    }
    try {
      const point = new Point(topic)
        // Preserve duplicate points
        // https://docs.influxdata.com/influxdb/v2/write-data/best-practices/duplicate-points/#add-an-arbitrary-tag
        .tag('uniq', randomUUID())
        .tag('userPseudoId', value.userPseudoId)
        .tag('channelId', value.channelId)
        .timestamp(new Date(value.ts))
        .stringField('dongleId', value.dongleId)
        .stringField('tvId', value.tvId)
        .stringField('userPseudoId', value.userPseudoId)
        .stringField('channelId', value.channelId)
        .intField('distanceCm', value.distanceCm)
        .intField('rssi', value.rssi)
        .intField('seq', value.seq);
      await writeClient.writePoint(point);
      await writeClient.flush();
    } catch (error) {
      console.log({ error });
    }
  });
})();
