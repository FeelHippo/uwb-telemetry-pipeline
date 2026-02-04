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
const broker = require("mqtt");
const message_1 = require("./validators/message");
const influx_1 = require("./db/influx");
const influxdb_client_1 = require("@influxdata/influxdb-client");
const node_crypto_1 = require("node:crypto");
const org = 'Filippo';
const bucket = 'uwb_telemetry_db';
const writeClient = influx_1.default.getWriteApi(org, bucket, 'ns');
const threshold = 150;
const testQuery = (topic) => __awaiter(void 0, void 0, void 0, function* () {
    let queryClient = influx_1.default.getQueryApi(org);
    let fluxQuery = `from(bucket: "uwb_telemetry_db")
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
// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#2-dwell-time-per-channel
// https://docs.influxdata.com/influxdb/cloud/query-data/flux/operate-on-timestamps/#calculate-the-duration-between-two-timestamps
// https://community.influxdata.com/t/help-with-cumulative-sum-please/33123
const testDwellTimePerChannel = (userPseudoId, channelId) => __awaiter(void 0, void 0, void 0, function* () {
    let queryClient = influx_1.default.getQueryApi(org);
    let fluxQuery = `from(bucket: "uwb_telemetry_db")
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
                // let's consider the time elapsed between the previous measurement and the current one:
                if ([current['channelId'], previous[index - 1]['channelId']].every((id) => channelId == id)) {
                    total +=
                        new Date(current['_time']).getTime() -
                            new Date(previous[index - 1]['_time']).getTime();
                }
            }
            console.log('\nSuccess', total);
            process.kill(process.pid, 'SIGINT');
        },
    });
});
// https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#3-channel-switches
const testContChannelSwitches = (userPseudoId) => {
    let queryClient = influx_1.default.getQueryApi(org);
    let fluxQuery = `from(bucket: "uwb_telemetry_db")
    |> range(start: -24h)
    |> filter(fn: (r) => r["userPseudoId"] == "${userPseudoId}")
    |> filter(fn: (r) => r["_field"] == "channelId")
    |> unique(column: "_value")
    |> count()
    |> yield(name: "Channel changes per session/day: ${userPseudoId}")`;
    queryClient.queryRows(fluxQuery, {
        next: (row, tableMeta) => {
            const tableObject = tableMeta.toObject(row);
            console.log(tableObject);
        },
        error: (error) => {
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
            client.publish(`symera/telemetry/${clientId}`, '{ "message": "Consumer Available" }');
        });
    });
    client.on('message', (topic, message) => __awaiter(void 0, void 0, void 0, function* () {
        const { value, error } = message_1.message_schema.validate(JSON.parse(message.toString()));
        if (error) {
            console.log({ error });
            return;
        }
        try {
            const point = new influxdb_client_1.Point(topic)
                // Preserve duplicate points
                // https://docs.influxdata.com/influxdb/v2/write-data/best-practices/duplicate-points/#add-an-arbitrary-tag
                .tag('uniq', (0, node_crypto_1.randomUUID)())
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
            yield writeClient.writePoint(point);
            yield writeClient.flush();
        }
        catch (error) {
            console.log({ error });
        }
        // TEST
        // await testQuery(topic);
        yield testDwellTimePerChannel(value.userPseudoId, value.channelId);
        // testContChannelSwitches(value.userPseudoId);
    }));
})();
