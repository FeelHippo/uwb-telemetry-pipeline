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
const org = 'Filippo';
const bucket = 'uwb_telemetry_db';
const writeClient = influx_1.default.getWriteApi(org, bucket, 'ns');
const threshold = 200;
const testQuery = (topic) => {
    let queryClient = influx_1.default.getQueryApi(org);
    let fluxQuery = `from(bucket: "uwb_telemetry_db")
 |> range(start: -10m)
 |> filter(fn: (r) => r._measurement == "${topic}")`;
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
const testDwellTimePerChannel = (userPseudoId, channelId) => {
    let queryClient = influx_1.default.getQueryApi(org);
    let fluxQuery = `from(bucket: "uwb_telemetry_db")
    |> range(start: -10m)
    |> filter(fn: (r) => r["userPseudoId"] == "${userPseudoId}" and r["channelId"] == "${channelId}")
    |> drop(columns: ["host"])`;
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
            yield writeClient.writePoint(point);
            yield writeClient.flush();
        }
        catch (error) {
            console.log({ error });
        }
        // TEST
        // testQuery(topic);
        testDwellTimePerChannel(value.userPseudoId, value.channelId);
    }));
})();
