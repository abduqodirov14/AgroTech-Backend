# Configuration settings

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Server
    port: int = 3003
    
    # Model paths
    soil_model_path: str = "app/models/soil_model.pkl"
    weather_model_path: str = "app/models/weather_model.pkl"
    
    # API Keys
    weather_api_key: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()

# TODO: Load ML models on startup
