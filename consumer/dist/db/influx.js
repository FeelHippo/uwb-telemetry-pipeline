"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const { InfluxDB } = require('@influxdata/influxdb-client');
const token = (_a = process.env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN) !== null && _a !== void 0 ? _a : '5J0CC86lbJT1KktGQ1X_16xNvClElpZWrjkI71D66ZAmkg_EHXMwtVz1sSTXLFLH9AZFt8Ltu4iZim0pCzQNlg==';
// const url = 'http://influxdb:8086';
const url = 'http://localhost:8086';
exports.default = new InfluxDB({ url, token });
