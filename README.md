### uwb-telemetry-pipeline

#### Docker Compose and Mosquitto Set Up

A simple Docker image can be run as follows:

```bash
docker run -d \
  --name mosquitto \
  -p 1883:1883 \
  -v $(pwd)/mosquitto/config:/mosquitto/config \
  -v $(pwd)/mosquitto/data:/mosquitto/data \
  -v $(pwd)/mosquitto/log:/mosquitto/log \
  eclipse-mosquitto:latest
```

If you run this project locally, don't forget to start your daemons:

```bash
sudo systemctl start docker
sudo systemctl start influxdb
```

This project uses [Docker Compose](https://docs.docker.com/compose/) to orchestrate the various containers required for this application.

To simulate a real life scenario, this project requires authentication:

```bash
docker exec -it mosquitto mosquitto_passwd -c /mosquitto/config/passwd username
```

The password file gets stored in your mounted config volume, so it persists between container restarts.

Check if everything is fine with the password file:

```bash
mosquitto -c ./mosquitto/config/mosquitto.conf

# in case of permission errors (Linux)
chown root:root mosquitto/config/passwd
chmod 777 mosquitto/config/passwd
```

Start the project:

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

curl --location 'http://localhost:3001/presence/?userPseudoId=tv-001-dng-006&threshold=150'

{
    "result": [
        {
            "result": "_result",
            "table": 0,
            "_start": "2026-02-04T15:57:04.583417404Z",
            "_stop": "2026-02-04T16:07:04.583417404Z",
            "_field": "distanceCm",
            "_measurement": "symera/telemetry/tv-001/dng-006",
            "channelId": "ABC",
            "uniq": "b9ca0862-8c64-47f6-b9af-2f8822ecbd25",
            "userPseudoId": "tv-001-dng-006",
            "_value": 38
        },
        {
            "result": "_result",
            "table": 0,
            "_start": "2026-02-04T15:57:04.583417404Z",
            "_stop": "2026-02-04T16:07:04.583417404Z",
            "_field": "distanceCm",
            "_measurement": "symera/telemetry/tv-001/dng-006",
            "channelId": "ABC",
            "uniq": "cfcb7320-06c0-4fa3-a384-cdc05c0503a2",
            "userPseudoId": "tv-001-dng-006",
            "_value": 150
        },
...

curl --location 'http://localhost:3001/dwell/?userPseudoId=tv-001-dng-006&channelId=ABC'

{
    "totalDwellTimeMs": 41057,
    "userPseudoId": "tv-001-dng-006",
    "channelId": "ABC"
}

curl --location 'http://localhost:3001/switches/?userPseudoId=tv-001-dng-006'

{
    "result": 27
}

```