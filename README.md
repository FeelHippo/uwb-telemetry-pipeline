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