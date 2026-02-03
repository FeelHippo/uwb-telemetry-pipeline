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