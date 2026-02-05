from(bucket: "uwb_telemetry_db")
|> range(start: -24h)
|> filter(fn: (r) => r._field == "channelId")
|> group(columns: ["channelId"])
|> aggregateWindow(
    column: "channelId",
    every: 1h,
    fn: (column, tables=<-) => tables
      |> count()
  )

from(bucket: "uwb_telemetry_db")
|> range(start: -6h)
|> filter(fn: (r) => r._field == "distanceCm")
|> filter(fn: (r) => r._value <= 150)
|> aggregateWindow(
    column: "channelId",
    every: 5m,
    fn: (column, tables=<-) => tables
      |> group(columns: ["channelId", "_stop"])
      |> count()
  )

from(bucket: "uwb_telemetry_db")
|> range(start: -6h)
|> filter(fn: (r) => r._field == "channelId")
|> group(columns: ["channelId"])
|> aggregateWindow(
    column: "channelId",
    every: 1h,
    fn: (column, tables=<-) => tables
      |> count()
  )
|> fill(column: "_value", usePrevious: true)
|> difference()

from(bucket: "uwb_telemetry_db")
|> range(start: -1h)
|> filter(fn: (r) => r._field == "userPseudoId")
|> group(columns: ["userPseudoId", "_stop"])
|> aggregateWindow(
    column: "userPseudoId",
    every: 5m,
    fn: (column, tables=<-) => tables
      |> distinct(column: "_value")
      |> count()
  )


