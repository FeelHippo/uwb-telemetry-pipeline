### uwb-telemetry-pipeline

#### Docker Compose and Mosquitto Set Up

- start your daemons:

```bash
sudo systemctl start docker
sudo systemctl start influxdb
```

- set up authentication:

```bash
docker exec -it mosquitto mosquitto_passwd -c /mosquitto/config/passwd username
```

- double check password file:

```bash
mosquitto -c ./mosquitto/config/mosquitto.conf

# in case of permission errors (Linux)
chown root:root mosquitto/config/passwd
chmod 777 mosquitto/config/passwd
```

- run the project:

```bash
docker system prune -a
docker-compose up --build
docker container ls
docker logs -f <mosquitto | uwb-telemetry-pipeline-client-1 | uwb-telemetry-pipeline-consumer-1>
```

To make sure everything is properly set up, use [MQTT Explorer](https://mqtt-explorer.com/) to test connection and messaging.

Testing the broker via Docker:

```bash
# Subscribe using the container
docker exec -it mosquitto mosquitto_sub -h localhost -t tv-001

# Publish using the container
docker exec -it mosquitto mosquitto_pub -h localhost -t tv-001 -m "Container message"
```

#### RESTful

```curl
curl --location 'http://localhost:3001/all'

{
    "result": [
        {
            "result": "_result",
            "table": 0,
            "_start": "2026-02-04T15:55:16.672860688Z",
            "_stop": "2026-02-04T16:05:16.672860688Z",
            "_time": "2026-02-04T15:55:22.766196495Z",
            "_value": 664,
            "_field": "counter",
            "_measurement": "boltdb_reads_total"
        },
        {
            "result": "_result",
            "table": 0,
            "_start": "2026-02-04T15:55:16.672860688Z",
            "_stop": "2026-02-04T16:05:16.672860688Z",
            "_time": "2026-02-04T15:55:32.767603583Z",
            "_value": 690,
            "_field": "counter",
            "_measurement": "boltdb_reads_total"
        },
        {
            "result": "_result",
            "table": 0,
            "_start": "2026-02-04T15:55:16.672860688Z",
            "_stop": "2026-02-04T16:05:16.672860688Z",
            "_time": "2026-02-04T15:55:42.763006235Z",
            "_value": 712,
            "_field": "counter",
            "_measurement": "boltdb_reads_total"
        },
...

curl --location 'http://localhost:3001/presence/?userPseudoId=tv-001-dng-005&threshold=150'

{
    "result": [
        {
            "result": "_result",
            "table": 0,
            "_start": "2026-02-05T20:48:27.542110054Z",
            "_stop": "2026-02-05T20:58:27.542110054Z",
            "_field": "distanceCm",
            "_measurement": "symera/telemetry/tv-001/dng-005",
            "channelId": "ABC",
            "uniq": "45b7ece3-b82d-4e28-b634-696318a1fd30",
            "userPseudoId": "tv-001-dng-005",
            "_value": 10
        },
        {
            "result": "_result",
            "table": 0,
            "_start": "2026-02-05T20:48:27.542110054Z",
            "_stop": "2026-02-05T20:58:27.542110054Z",
            "_field": "distanceCm",
            "_measurement": "symera/telemetry/tv-001/dng-005",
            "channelId": "ABC",
            "uniq": "ccefe865-2ccb-4d2f-97ac-eeca28935407",
            "userPseudoId": "tv-001-dng-005",
            "_value": 78
        },
...

curl --location 'http://localhost:3001/dwell/?userPseudoId=tv-001-dng-005&channelId=ABC'

{
    "result": 504204
}

curl --location 'http://localhost:3001/switches/?userPseudoId=tv-001-dng-005'

{
    "result": 27
}

```

## Assignment Overview

- [Problem Statement](https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#1-problem-statement)

- [Requirements](https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#2-requirements)

- Architecture: [Local First](https://github.com/Symera-Wesuite/uwb-telemetry-pipeline-assignment?tab=readme-ov-file#option-1-local-first-preferred)

## ETL / Processing

- Basic Ingestion
  - Subscribe to MQTT topics
    - [client](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/client/index.ts#L63)
    - [consumer](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/consumer/mqtt/client.ts#L17)
  - [Validate schema](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/main/consumer/validators/message.ts)
  - [Write raw events into InfluxDB](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/consumer/mqtt/client.ts#L44)
- Derived Metrics (see [backup Flux queries](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/main/grafana_dashboard/backup_grafana.md))
  - [presence](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/consumer/constroller/index.ts#L60)
  - [dwell](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/consumer/constroller/index.ts#L119)
  - [switches](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/consumer/constroller/index.ts#L190)
- Handling Real-World Issues
  - [duplication](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/consumer/mqtt/client.ts#L45)
  - [Out-of-order](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/consumer/constroller/index.ts#L75)
- Grafana Dashboard
  - [exported JSON](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/main/grafana_dashboard/grafana-dashboard.json)
  - [backup Flux queries](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/main/grafana_dashboard/backup_grafana.md)
- Simulation Requirements
  - [client](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/main/client/index.ts) emulates the following:
    - [Multiple TVs: 2–3](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/client/index.ts#L90)
    - [Multiple dongles: 3–10](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/client/index.ts#L62)
    - [Multiple users: pseudonymous](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/client/index.ts#L77)
  - Channel Changes: random
  - Distance Patterns: random
  - Output Rate: [configurable](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/3128eaa6769d44dec24d663855c3e64e0fac31b0/client/index.ts#L84)
- Deliverables:
  - [docker-compose.yml](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/main/docker-compose.yml)
  - [ETL service source code](https://github.com/FeelHippo/uwb-telemetry-pipeline/tree/main/consumer)
  - [ Simulator source code](https://github.com/FeelHippo/uwb-telemetry-pipeline/tree/main/client)
  - [Grafana dashboard export JSON](https://github.com/FeelHippo/uwb-telemetry-pipeline/blob/main/grafana_dashboard/grafana-dashboard.json)
- [readme.md](https://github.com/FeelHippo/uwb-telemetry-pipeline/tree/main)

### Notes
- throughout the project you will find comments and links that provide:
  - explanations
  - reasoning
  - external links to sources
  - todo's
- NO AI was used to work on this project. I've never used AI coding tools, and never will. 