import influxClient from '../db/influx';
import { FluxTableMetaData } from '@influxdata/influxdb-client';
import { org, bucket } from '../mqtt/client';
import { ServerResponse } from 'node:http';

// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#1-presence
export const testQuery = async (
  res: ServerResponse,
  userPseudoId: string,
  threshold: string,
) => {
  try {
    let queryClient = influxClient.getQueryApi(org);
    let fluxQuery = `from(bucket: "${bucket}")
 |> range(start: -10m)
 |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")
 |> filter(fn: (r) => r["_field"] == "distanceCm")
 |> filter(fn: (r) => r["_value"] <= ${threshold})
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            result,
          }),
        );
      },
    });
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(error));
  }
};

// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#2-dwell-time-per-channel
// https://docs.influxdata.com/influxdb/cloud/query-data/flux/operate-on-timestamps/#calculate-the-duration-between-two-timestamps
// https://community.influxdata.com/t/help-with-cumulative-sum-please/33123
export const DwellTimePerChannel = async (
  res: ServerResponse,
  userPseudoId: string,
  channelId: string,
) => {
  try {
    let queryClient = influxClient.getQueryApi(org);
    let fluxQuery = `from(bucket: "${bucket}")
    |> range(start: -10m)
    |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")
    |> sort(columns: ["dongleId", "seq"])`;

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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            total_dwell_time_ms: total,
            userPseudoId,
            channelId,
          }),
        );
      },
    });
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(error));
  }
};

// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#3-channel-switches
export const testCountChannelSwitches = async (userPseudoId: string) => {
  let queryClient = influxClient.getQueryApi(org);
  let fluxQuery = `from(bucket: "${bucket}")
    |> range(start: -24h)
    |> filter(fn: (r) => r["userPseudoId"] == "${userPseudoId}")
    |> filter(fn: (r) => r["_field"] == "channelId")
    |> sort(columns: ["dongleId", "seq"])
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
