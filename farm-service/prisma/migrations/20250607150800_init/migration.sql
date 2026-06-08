CREATE TYPE "NotificationType" AS ENUM ('ALERT', 'IRRIGATION', 'WEATHER', 'SYSTEM');
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "IrrigationStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "IrrigationSource" AS ENUM ('MANUAL', 'AI', 'SCHEDULE');

CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "mac_address" TEXT NOT NULL,
    "name" TEXT,
    "secret_key" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "zone_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sensor_readings" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "moisture" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "ec" DOUBLE PRECISION,
    "npk" DOUBLE PRECISION,
    "battery" DOUBLE PRECISION,
    "signal_strength" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "irrigation_events" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "device_id" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "duration_sec" INTEGER,
    "status" "IrrigationStatus" NOT NULL,
    "source" "IrrigationSource" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "irrigation_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "weather_forecasts" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "precipitation" DOUBLE PRECISION NOT NULL,
    "wind_speed" DOUBLE PRECISION NOT NULL,
    "et0" DOUBLE PRECISION NOT NULL,
    "forecast_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weather_forecasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "zones_user_id_idx" ON "zones"("user_id");
CREATE UNIQUE INDEX "devices_mac_address_key" ON "devices"("mac_address");
CREATE INDEX "sensor_readings_device_id_idx" ON "sensor_readings"("device_id");
CREATE INDEX "sensor_readings_created_at_idx" ON "sensor_readings"("created_at");
CREATE INDEX "weather_forecasts_zone_id_forecast_date_idx" ON "weather_forecasts"("zone_id","forecast_date");
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id","is_read");

ALTER TABLE "zones"
ADD CONSTRAINT "zones_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "devices"
ADD CONSTRAINT "devices_zone_id_fkey"
FOREIGN KEY ("zone_id") REFERENCES "zones"("id");

ALTER TABLE "sensor_readings"
ADD CONSTRAINT "sensor_readings_device_id_fkey"
FOREIGN KEY ("device_id") REFERENCES "devices"("id");

ALTER TABLE "irrigation_events"
ADD CONSTRAINT "irrigation_events_zone_id_fkey"
FOREIGN KEY ("zone_id") REFERENCES "zones"("id");

ALTER TABLE "irrigation_events"
ADD CONSTRAINT "irrigation_events_device_id_fkey"
FOREIGN KEY ("device_id") REFERENCES "devices"("id");

ALTER TABLE "weather_forecasts"
ADD CONSTRAINT "weather_forecasts_zone_id_fkey"
FOREIGN KEY ("zone_id") REFERENCES "zones"("id");

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id");