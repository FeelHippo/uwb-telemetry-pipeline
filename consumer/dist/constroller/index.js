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
exports.testCountChannelSwitches = exports.DwellTimePerChannel = exports.testQuery = void 0;
const influx_1 = require("../db/influx");
const client_1 = require("../mqtt/client");
const testQuery = (topic) => __awaiter(void 0, void 0, void 0, function* () {
    let queryClient = influx_1.default.getQueryApi(client_1.org);
    let fluxQuery = `from(bucket: "${client_1.bucket}")
 |> range(start: -10m)
 |> filter(fn: (r) => r._measurement == "${topic}")
 |> filter(fn: (r) => r._field == "distanceCm")
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
            console.log('\nSuccess', result);
            process.kill(process.pid, 'SIGINT');
        },
    });
});
exports.testQuery = testQuery;
// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#2-dwell-time-per-channel
// https://docs.influxdata.com/influxdb/cloud/query-data/flux/operate-on-timestamps/#calculate-the-duration-between-two-timestamps
// https://community.influxdata.com/t/help-with-cumulative-sum-please/33123
const DwellTimePerChannel = (res, userPseudoId, channelId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let queryClient = influx_1.default.getQueryApi(client_1.org);
        let fluxQuery = `from(bucket: "${client_1.bucket}")
    |> range(start: -10m)
    |> filter(fn: (r) => r.userPseudoId == "${userPseudoId}")`;
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
                        return;
                    const current = result[index];
                    const previous = result[index - 1];
                    // let's consider the time elapsed between the previous measurement and the current one
                    // this needs fine tuning. TODO(Filippo)
                    if ([current['channelId'], previous['channelId']].every((id) => channelId == id)) {
                        total +=
                            new Date(current['_time']).getTime() -
                                new Date(previous[index - 1]['_time']).getTime();
                    }
                }
                console.log('\nSuccess', total);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ total_dwell_time_ms: total, userPseudoId, channelId, }));
            },
        });
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(error));
    }
});
exports.DwellTimePerChannel = DwellTimePerChannel;
// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#3-channel-switches
const testCountChannelSwitches = (userPseudoId) => __awaiter(void 0, void 0, void 0, function* () {
    let queryClient = influx_1.default.getQueryApi(client_1.org);
    let fluxQuery = `from(bucket: "${client_1.bucket}")
    |> range(start: -24h)
    |> filter(fn: (r) => r["userPseudoId"] == "${userPseudoId}")
    |> filter(fn: (r) => r["_field"] == "channelId")
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
            console.log('\nSuccess', result);
            process.kill(process.pid, 'SIGINT');
        },
    });
});
exports.testCountChannelSwitches = testCountChannelSwitches;
