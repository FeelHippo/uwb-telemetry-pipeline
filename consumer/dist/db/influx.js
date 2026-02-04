"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { InfluxDB } = require('@influxdata/influxdb-client');
// https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/nodejs/write/
// API Token Localhost
// I-Px4mxWr5qBERAzlZUPnYsu6XbAEYYZnUfxHN755w3yAqTupUVKqWa-6fq0S-FkUt7Mz3KRkjHNTA-bBEOkPw==
const token = 'I-Px4mxWr5qBERAzlZUPnYsu6XbAEYYZnUfxHN755w3yAqTupUVKqWa-6fq0S-FkUt7Mz3KRkjHNTA-bBEOkPw==';
const url = 'http://localhost:8086';
exports.default = new InfluxDB({ url, token });
