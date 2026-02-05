import influxClient from '../db/influx';
import { FluxTableMetaData } from '@influxdata/influxdb-client';
import { org, bucket } from '../mqtt/client';
import { ServerResponse } from 'node:http';

/**
 *
 * Return all measurements from the past 10 minutes
 * Use for testing
 *
 * @param res: ServerResponse
 * @returns { [key: string]: any; }[]
 */
export const allRecentMeasurements = async (res: ServerResponse) => {
  try {
    let queryClient = influxClient.getQueryApi(org);
    let fluxQuery = `from(bucket: "${bucket}")
 |> range(start: -10m)`;
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

/**
 *
 * Return all measurements from within a threshold for a user
 *
 * @param res: ServerResponse
 * @param userPseudoId: string
 * @param threshold: string
 * @returns { [key: string]: any; }[]
 *
 * @external https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#1-presence
 */
export const measurementsWithinPresence = async (
  res: ServerResponse,
  userPseudoId: string,
  threshold: string,
) => {
  try {
    let queryClient = influxClient.getQueryApi(org);
    let fluxQuery = `from(bucket: "${bucket}")
 |> range(start: -6h)
 |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")
 |> filter(fn: (r) => r._field == "distanceCm")
 |> filter(fn: (r) => r._value <= ${threshold})
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

/**
 *
 * Return all dwell time for a user on a channel in milliseconds
 *
 * @param res: ServerResponse
 * @param userPseudoId: string
 * @param threshold: string
 * @returns { totalDwellTimeMs: number; }
 *
 * @external https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#2-dwell-time-per-channel
 * @external https://docs.influxdata.com/influxdb/cloud/query-data/flux/operate-on-timestamps/#calculate-the-duration-between-two-timestamps
 * @external https://community.influxdata.com/t/help-with-cumulative-sum-please/33123
 *
 */
export const dwellTimePerChannel = async (
  res: ServerResponse,
  userPseudoId: string,
  channelId: string,
) => {
  try {
    let queryClient = influxClient.getQueryApi(org);
    let fluxQuery = `from(bucket: "${bucket}")
    |> range(start: -6h)
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
          if (!index) continue;
          const current = result[index];
          const previous = result[index - 1];
          // let's consider the time elapsed between the previous measurement and the current one
          // by moving the condition in here instead of the Flux query
          // we can consider the time NOT spent on a particular channel
          // e.g.: | channel_1 | channel_1 | channel_2 | channel_2 | channel_1 | channel_1
          //       ~~~~~~~~~~~~~~~~~~~~~~~~                         ~~~~~~~~~~~~~~~~~~~~~~
          // this needs fine tuning. TODO(Filippo).
          if (
            [current['channelId'], previous['channelId']].every(
              (id: string) => channelId == id,
            )
          ) {
            total +=
              new Date(current['_time']).getTime() -
              new Date(previous['_time']).getTime();
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            result: total,
          }),
        );
      },
    });
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(error));
  }
};

/**
 *
 * Return the amount of channel switches for a user
 *
 * @param res: ServerResponse
 * @param userPseudoId: string
 * @returns { result: number; }
 *
 * @external https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#3-channel-switches
 *
 */
export const countChannelSwitches = async (
  res: ServerResponse,
  userPseudoId: string,
) => {
  try {
    let queryClient = influxClient.getQueryApi(org);
    let fluxQuery = `from(bucket: "${bucket}")
    |> range(start: -6h)
    |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")
    |> filter(fn: (r) => r._field == "channelId")
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            result: result.filter((row, index, arr) =>
              !index ? row : row['channelId'] != arr[index - 1]['channelId'],
            ).length,
          }),
        );
      },
    });
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(error));
  }
};
