import { ValidationResult } from 'joi';
import * as broker from 'mqtt';
import { message_schema } from './validators/message';
import { Message } from './interfaces/message';
import influxClient from './db/influx';
import { FluxTableMetaData, Point } from '@influxdata/influxdb-client';
import { randomUUID } from 'node:crypto';

const org = 'Filippo';
const bucket = 'uwb_telemetry_db';
const writeClient = influxClient.getWriteApi(org, bucket, 'ns');
const threshold = 150;

const testQuery = async (topic: string) => {
  let queryClient = influxClient.getQueryApi(org);
  let fluxQuery = `from(bucket: "uwb_telemetry_db")
 |> range(start: -10m)
 |> filter(fn: (r) => r._measurement == "${topic}")
 |> filter(fn: (r) => r._field == "distanceCm")
 |> sort(columns: ["dongleId", "seq"])
 |> mean()
 |> group()`;
  // Handle minor out-of-order within a window
  // https://docs.influxdata.com/influxdb/cloud/query-data/flux/sort-limit/

  let result: {
    [key: string]: any;
  }[] = [];

  await queryClient.queryRows(fluxQuery, {
    next: (row: string[], tableMeta: FluxTableMetaData) => {
      const tableObject = tableMeta.toObject(row);
      result.push(tableObject);
    },
    error: (error: Error) => {
      console.error('\nError', error);
    },
    complete: () => {
      console.log('\nSuccess', result);
      process.kill(process.pid, 'SIGINT');
    },
  });
};

// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#2-dwell-time-per-channel
// https://docs.influxdata.com/influxdb/cloud/query-data/flux/operate-on-timestamps/#calculate-the-duration-between-two-timestamps
// https://community.influxdata.com/t/help-with-cumulative-sum-please/33123
const testDwellTimePerChannel = async (
  userPseudoId: string,
  channelId: string,
) => {
  let queryClient = influxClient.getQueryApi(org);
  let fluxQuery = `from(bucket: "uwb_telemetry_db")
    |> range(start: -10m)
    |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")`;

  let result: {
    [key: string]: any;
  }[] = [];

  await queryClient.queryRows(fluxQuery, {
    next: (row: string[], tableMeta: FluxTableMetaData) => {
      const tableObject = tableMeta.toObject(row);
      result.push(tableObject);
    },
    error: (error: Error) => {
      console.error('\nError', error);
    },
    complete: () => {
      let total = 0;
      for (let index = 0; index < result.length; index++) {
        if (!index) return;
        const current = result[index];
        const previous = result[index - 1];
        // let's consider the time elapsed between the previous measurement and the current one
        // this needs fine tuning. TODO(Filippo)
        if (
          [current['channelId'], previous['channelId']].every(
            (id: string) => channelId == id,
          )
        ) {
          total +=
            new Date(current['_time']).getTime() -
            new Date(previous[index - 1]['_time']).getTime();
        }
      }
      console.log('\nSuccess', total);
      process.kill(process.pid, 'SIGINT');
    },
  });
};

// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#3-channel-switches
const testCountChannelSwitches = async (userPseudoId: string) => {
  let queryClient = influxClient.getQueryApi(org);
  let fluxQuery = `from(bucket: "uwb_telemetry_db")
    |> range(start: -24h)
    |> filter(fn: (r) => r["userPseudoId"] == "${userPseudoId}")
    |> filter(fn: (r) => r["_field"] == "channelId")
    |> unique(column: "_value")
    |> count()`;

  let result: {
    [key: string]: any;
  }[] = [];

  await queryClient.queryRows(fluxQuery, {
    next: (row: string[], tableMeta: FluxTableMetaData) => {
      const tableObject = tableMeta.toObject(row);
      result.push(tableObject);
    },
    error: (error: Error) => {
      console.error('\nError', error);
    },
    complete: () => {
      console.log('\nSuccess', result);
      process.kill(process.pid, 'SIGINT');
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
        .intField('seq', value.seq)
        // https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#1-presence
        .booleanField('present', value.distanceCm <= threshold);
      await writeClient.writePoint(point);
      await writeClient.flush();
    } catch (error) {
      console.log({ error });
    }
    // TEST
    // await testQuery(topic);
    await testDwellTimePerChannel(value.userPseudoId, value.channelId);
    // await testCountChannelSwitches(value.userPseudoId);
  });
})();
