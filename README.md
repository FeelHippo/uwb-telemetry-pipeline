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

This project uses [Docker Compose](https://docs.docker.com/compose/) to orchestrate the various containers required for this application.

To simulate a real life scenario, this project requires authentication:

```bash
docker exec -it mosquitto mosquitto_passwd -c /mosquitto/config/passwd username
```

The password file gets stored in your mounted config volume, so it persists between container restarts.

Start the project:

```bash
docker-compose up -d

sudo docker logs -f mosquitto
```

To make sure everything is properly set up, use [MQTT Explorer](https://mqtt-explorer.com/) to test connection and messaging.