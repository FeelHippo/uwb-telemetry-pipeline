const { InfluxDB } = require('@influxdata/influxdb-client');

const token =
  process.env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN ??
  '5J0CC86lbJT1KktGQ1X_16xNvClElpZWrjkI71D66ZAmkg_EHXMwtVz1sSTXLFLH9AZFt8Ltu4iZim0pCzQNlg==';
const url = 'http://influxdb:8086';

export default new InfluxDB({ url, token });
