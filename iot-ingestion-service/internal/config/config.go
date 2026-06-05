package config

// Environment configuration
// Database URL, MQTT broker, HTTP port

type Config struct {
	// Server
	Port string
	
	// Database (TimescaleDB)
	DatabaseURL string
	
	// MQTT Broker
	MQTTBroker   string
	MQTTUsername string
	MQTTPassword string
	MQTTClientID string
	
	// Topics
	SensorTopic string
}

// TODO: LoadConfig() funksiyasi - .env'dan o'qish
