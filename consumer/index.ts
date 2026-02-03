import { ValidationResult } from 'joi';
import * as broker from 'mqtt';
import { message_schema } from './validators/message';
import { Message } from './interfaces/message';
import influxClient from './db/influx';
import { Point } from '@influxdata/influxdb-client';

const org = 'Filippo';
const bucket = 'uwb_telemetry_db';
const writeClient = influxClient.getWriteApi(org, bucket, 'ns');
const threshold = 200;

const testQuery = (topic: string) => {
  let queryClient = influxClient.getQueryApi(org);
  let fluxQuery = `from(bucket: "uwb_telemetry_db")
 |> range(start: -10m)
 |> filter(fn: (r) => r._measurement == "${topic}")`;

  queryClient.queryRows(fluxQuery, {
    next: (row: any, tableMeta: any) => {
      const tableObject = tableMeta.toObject(row);
      console.log(tableObject);
    },
    error: (error: any) => {
      console.error('\nError', error);
    },
    complete: () => {
      console.log('\nSuccess');
    },
  });
};

// https://docs.influxdata.com/influxdb/cloud/query-data/flux/operate-on-timestamps/#calculate-the-duration-between-two-timestamps
// https://community.influxdata.com/t/help-with-cumulative-sum-please/33123
const testDwellTimePerChannel = (userPseudoId: string, channelId: string) => {
  let queryClient = influxClient.getQueryApi(org);
  let fluxQuery = `from(bucket: "uwb_telemetry_db")
    |> range(start: -24h)
    |> filter(fn: (r) => r["userPseudoId"] == "${userPseudoId}" and r["channelId"] == "${channelId}")
    |> reduce(
        fn: (r, accumulator) => {
          stop = uint(v: r["_stop"])
          start = uint(v: r["_start"])
          curr_total_dwell_time = accumulator.total_dwell_time + uint(v: stop - start)
          return {
            total_dwell_time: curr_total_dwell_time,
          }
        },
        identity: {total_dwell_time: uint(v: 0)},
    )
    |> yield(name: "Total dwell time in ms on ${channelId} for ${userPseudoId}")`;

  queryClient.queryRows(fluxQuery, {
    next: (row: any, tableMeta: any) => {
      const tableObject = tableMeta.toObject(row);
      console.log(tableObject);
    },
    error: (error: any) => {
      console.error('\nError', error);
    },
    complete: () => {
      console.log('\nSuccess');
    },
  });
};

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
        .tag('userPseudoId', value.userPseudoId)
        .tag('channelId', value.channelId)
        .timestamp(new Date(value.ts))
        .stringField('dongleId', value.dongleId)
        .stringField('tvId', value.tvId)
        .stringField('userPseudoId', value.userPseudoId)
        .stringField('channelId', value.channelId)
        .intField('distanceCm', value.distanceCm)
        .intField('rssi', value.rssi)
        .intField('seq', value.seq)
        .booleanField('present', value.distanceCm <= threshold);
      await writeClient.writePoint(point);
      await writeClient.flush();
    } catch (error) {
      console.log({ error });
    }
    // TEST
    // testQuery(topic);
    testDwellTimePerChannel(value.userPseudoId, value.channelId);
  });
})();
