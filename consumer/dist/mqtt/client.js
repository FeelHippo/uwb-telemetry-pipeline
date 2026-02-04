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
exports.bucket = exports.org = void 0;
const node_crypto_1 = require("node:crypto");
const broker = require("mqtt");
const influx_1 = require("../db/influx");
const message_1 = require("../validators/message");
const influxdb_client_1 = require("@influxdata/influxdb-client");
exports.org = 'Filippo';
exports.bucket = 'uwb_telemetry_db';
const writeClient = influx_1.default.getWriteApi(exports.org, exports.bucket, 'ns');
exports.default = (() => {
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
                .intField('seq', value.seq);
            // https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#1-presence
            // .booleanField('present', value.distanceCm <= threshold);
            yield writeClient.writePoint(point);
            yield writeClient.flush();
        }
        catch (error) {
            console.log({ error });
        }
        // TEST
        // await testQuery(topic);
        // await testDwellTimePerChannel(value.userPseudoId, value.channelId);
        // await testCountChannelSwitches(value.userPseudoId);
    }));
})();
