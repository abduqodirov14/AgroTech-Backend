import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    rain: number;
    weatherCode: number;
    pressure: number;
    windSpeed: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature: number[];
    humidity: number[];
    precipitationProbability: number[];
    rain: number[];
    windSpeed: number[];
  };
  daily: {
    time: string[];
    temperatureMax: number[];
    temperatureMin: number[];
    rainSum: number[];
    precipitationProbabilityMax: number[];
    windSpeedMax: number[];
    uvIndexMax: number[];
  };
}

export interface SoilData {
  hourly: {
    time: string[];
    soilTemperature0cm: number[];
    soilMoisture0to1cm: number[];
    soilMoisture9to27cm: number[];
    soilMoisture27to81cm: number[];
  };
  daily: {
    time: string[];
    et0FaoEvapotranspiration: number[];
  };
}

export const fetchWeatherData = async (
  latitude?: number,
  longitude?: number
): Promise<WeatherData> => {
  const lat = latitude || env.DEFAULT_LATITUDE;
  const lon = longitude || env.DEFAULT_LONGITUDE;

  const params = {
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'rain',
      'weather_code',
      'surface_pressure',
      'wind_speed_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'rain',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'rain_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'uv_index_max',
    ].join(','),
  };

  try {
    logger.info(`📡 Fetching weather data for lat=${lat}, lon=${lon}`);
    const response = await axios.get(env.OPEN_METEO_API_URL, { params });
    
    logger.info(`✅ Weather data received successfully`);

    return {
      current: {
        temperature: response.data.current.temperature_2m,
        humidity: response.data.current.relative_humidity_2m,
        rain: response.data.current.rain,
        weatherCode: response.data.current.weather_code,
        pressure: response.data.current.surface_pressure,
        windSpeed: response.data.current.wind_speed_10m,
        time: response.data.current.time,
      },
      hourly: {
        time: response.data.hourly.time,
        temperature: response.data.hourly.temperature_2m,
        humidity: response.data.hourly.relative_humidity_2m,
        precipitationProbability: response.data.hourly.precipitation_probability,
        rain: response.data.hourly.rain,
        windSpeed: response.data.hourly.wind_speed_10m,
      },
      daily: {
        time: response.data.daily.time,
        temperatureMax: response.data.daily.temperature_2m_max,
        temperatureMin: response.data.daily.temperature_2m_min,
        rainSum: response.data.daily.rain_sum,
        precipitationProbabilityMax: response.data.daily.precipitation_probability_max,
        windSpeedMax: response.data.daily.wind_speed_10m_max,
        uvIndexMax: response.data.daily.uv_index_max,
      },
    };
  } catch (error: any) {
    logger.error(`❌ Failed to fetch weather data: ${error.message}`);
    throw new Error('Failed to fetch weather data from Open-Meteo API');
  }
};

export const fetchSoilData = async (
  latitude?: number,
  longitude?: number
): Promise<SoilData> => {
  const lat = latitude || env.DEFAULT_LATITUDE;
  const lon = longitude || env.DEFAULT_LONGITUDE;

  const params = {
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    hourly: [
      'soil_temperature_0cm',
      'soil_moisture_0_to_1cm',
      'soil_moisture_9_to_27cm',
      'soil_moisture_27_to_81cm',
    ].join(','),
    daily: ['et0_fao_evapotranspiration'].join(','),
  };

  try {
    logger.info(`📡 Fetching soil data for lat=${lat}, lon=${lon}`);
    const response = await axios.get(env.OPEN_METEO_API_URL, { params });
    
    logger.info(`✅ Soil data received successfully`);

    return {
      hourly: {
        time: response.data.hourly.time,
        soilTemperature0cm: response.data.hourly.soil_temperature_0cm,
        soilMoisture0to1cm: response.data.hourly.soil_moisture_0_to_1cm,
        soilMoisture9to27cm: response.data.hourly.soil_moisture_9_to_27cm,
        soilMoisture27to81cm: response.data.hourly.soil_moisture_27_to_81cm,
      },
      daily: {
        time: response.data.daily.time,
        et0FaoEvapotranspiration: response.data.daily.et0_fao_evapotranspiration,
      },
    };
  } catch (error: any) {
    logger.error(`❌ Failed to fetch soil data: ${error.message}`);
    throw new Error('Failed to fetch soil data from Open-Meteo API');
  }
};
