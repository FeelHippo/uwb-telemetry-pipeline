"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.countChannelSwitches = exports.dwellTimePerChannel = exports.measurementsWithinPresence = exports.allRecentMeasurements = void 0;
const influx_1 = require("../db/influx");
const client_1 = require("../mqtt/client");
/**
 *
 * Return all measurements from the past 10 minutes
 * Use for testing
 *
 * @param res: ServerResponse
 * @returns { [key: string]: any; }[]
 */
const allRecentMeasurements = (res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let queryClient = influx_1.default.getQueryApi(client_1.org);
        let fluxQuery = `from(bucket: "${client_1.bucket}")
 |> range(start: -10m)`;
        // Handle minor out-of-order within a window
        // https://docs.influxdata.com/influxdb/cloud/query-data/flux/sort-limit/
        let result = [];
        yield queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row);
                result.push(tableObject);
            },
            error: (error) => {
                console.error('\nError', error);
            },
            complete: () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    result,
                }));
            },
        });
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(error));
    }
});
exports.allRecentMeasurements = allRecentMeasurements;
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
const measurementsWithinPresence = (res, userPseudoId, threshold) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let queryClient = influx_1.default.getQueryApi(client_1.org);
        let fluxQuery = `from(bucket: "${client_1.bucket}")
 |> range(start: -6h)
 |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")
 |> filter(fn: (r) => r._field == "distanceCm")
 |> filter(fn: (r) => r._value <= ${threshold})
 |> sort(columns: ["dongleId", "seq"])
 |> mean()
 |> group()`;
        // Handle minor out-of-order within a window
        // https://docs.influxdata.com/influxdb/cloud/query-data/flux/sort-limit/
        let result = [];
        yield queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row);
                result.push(tableObject);
            },
            error: (error) => {
                console.error('\nError', error);
            },
            complete: () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    result,
                }));
            },
        });
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(error));
    }
});
exports.measurementsWithinPresence = measurementsWithinPresence;
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
const dwellTimePerChannel = (res, userPseudoId, channelId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let queryClient = influx_1.default.getQueryApi(client_1.org);
        let fluxQuery = `from(bucket: "${client_1.bucket}")
    |> range(start: -6h)
    |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")
    |> sort(columns: ["dongleId", "seq"])`;
        let result = [];
        yield queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row);
                result.push(tableObject);
            },
            error: (error) => {
                console.error('\nError', error);
            },
            complete: () => {
                let total = 0;
                for (let index = 0; index < result.length; index++) {
                    if (!index)
                        continue;
                    const current = result[index];
                    const previous = result[index - 1];
                    // let's consider the time elapsed between the previous measurement and the current one
                    // by moving the condition in here instead of the Flux query
                    // we can consider the time NOT spent on a particular channel
                    // e.g.: | channel_1 | channel_1 | channel_2 | channel_2 | channel_1 | channel_1
                    //       ~~~~~~~~~~~~~~~~~~~~~~~~                         ~~~~~~~~~~~~~~~~~~~~~~
                    // this needs fine tuning. TODO(Filippo).
                    if ([current['channelId'], previous['channelId']].every((id) => channelId == id)) {
                        total +=
                            new Date(current['_time']).getTime() -
                                new Date(previous['_time']).getTime();
                    }
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    result: total,
                }));
            },
        });
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(error));
    }
});
exports.dwellTimePerChannel = dwellTimePerChannel;
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
const countChannelSwitches = (res, userPseudoId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let queryClient = influx_1.default.getQueryApi(client_1.org);
        let fluxQuery = `from(bucket: "${client_1.bucket}")
    |> range(start: -6h)
    |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")
    |> filter(fn: (r) => r._field == "channelId")
    |> sort(columns: ["dongleId", "seq"])
    |> unique(column: "_value")
    |> count()`;
        let result = [];
        yield queryClient.queryRows(fluxQuery, {
            next: (row, tableMeta) => {
                const tableObject = tableMeta.toObject(row);
                result.push(tableObject);
            },
            error: (error) => {
                console.error('\nError', error);
            },
            complete: () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    result: result.filter((row, index, arr) => !index ? row : row['channelId'] != arr[index - 1]['channelId']).length,
                }));
            },
        });
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(error));
    }
});
exports.countChannelSwitches = countChannelSwitches;
