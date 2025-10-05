const axios = require('axios');
const config = require('../config/config');

/**
 * Service for OpenAQ Air Quality Data Platform API
 * Provides real-time air quality monitoring and pollution data
 */
class OpenaqService {
  constructor() {
    this.baseUrl = config.openaq.baseUrl;
    this.apiKey = config.openaq.apiKey;
    this.timeout = config.openaq.timeout;
    this.defaultRadius = config.openaq.defaultRadius;
    this.defaultLimit = config.openaq.defaultLimit;
  }

  /**
   * Find air quality monitoring stations by coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radius - Search radius in meters (default: 25000)
   * @param {number} limit - Maximum number of stations to return (default: 10)
   * @returns {Promise<Object>} Formatted stations data
   */
  async findStations(lat, lon, radius = this.defaultRadius, limit = this.defaultLimit) {
    // Validate coordinates
    this.validateCoordinates(lat, lon);

    const url = `${this.baseUrl}/locations`;
    const params = {
      coordinates: `${lat},${lon}`,
      radius: radius,
      limit: limit
    };

    try {
      console.log(`Fetching OpenAQ stations for coordinates: ${lat}, ${lon} with radius ${radius}m`);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;

      return this.formatStationsResponse(response.data, lat, lon, radius, processingTime);
    } catch (error) {
      console.error('OpenAQ stations request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get measurements for a specific sensor
   * @param {number} sensorId - Sensor ID
   * @returns {Promise<Object>} Formatted measurements data
   */
  async getSensorMeasurements(sensorId) {
    if (!sensorId || isNaN(sensorId)) {
      const error = new Error('Invalid sensor ID');
      error.code = 'INVALID_SENSOR_ID';
      error.statusCode = 400;
      throw error;
    }

    const url = `${this.baseUrl}/sensors/${sensorId}/measurements`;
    const params = {
      limit: 1,
      order_by: '-datetime'
    };

    try {
      console.log(`Fetching measurements for sensor: ${sensorId}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;

      return this.formatMeasurementsResponse(response.data, sensorId, processingTime);
    } catch (error) {
      console.error('OpenAQ measurements request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get comprehensive air quality data for a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} radius - Search radius in meters
   * @param {number} limit - Maximum number of stations to check
   * @returns {Promise<Object>} Comprehensive air quality assessment
   */
  async getAirQuality(lat, lon, radius = this.defaultRadius, limit = this.defaultLimit) {
    try {
      // Step 1: Find nearby stations
      const stationsResult = await this.findStations(lat, lon, radius, limit);

      if (!stationsResult.data || stationsResult.data.length === 0) {
        const error = new Error('No air quality monitoring stations found in the specified area');
        error.code = 'NO_STATIONS_FOUND';
        error.statusCode = 404;
        throw error;
      }

      // Step 2: Get the nearest station with recent data
      const nearestStation = this.selectBestStation(stationsResult.data);

      if (!nearestStation) {
        const error = new Error('No active stations found with recent measurements');
        error.code = 'NO_ACTIVE_STATIONS';
        error.statusCode = 404;
        throw error;
      }

      // Step 3: Fetch measurements for all available sensors at this station
      const measurements = await this.fetchStationMeasurements(nearestStation);

      // Step 4: Assess overall air quality
      const assessment = this.assessOverallAirQuality(measurements);

      return {
        success: true,
        data: {
          station: {
            id: nearestStation.id,
            name: nearestStation.name,
            distance: nearestStation.distance,
            coordinates: nearestStation.coordinates,
            lastUpdate: nearestStation.datetimeLast
          },
          measurements: measurements,
          assessment: assessment,
          healthRecommendations: this.getHealthRecommendations(assessment)
        },
        requestTimestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('OpenAQ air quality request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Fetch measurements for all sensors at a station
   * @private
   */
  async fetchStationMeasurements(station) {
    const measurements = [];
    const priorityParameters = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co'];

    // Filter sensors for priority parameters
    const relevantSensors = station.sensors.filter(sensor => 
      priorityParameters.includes(sensor.parameter.name)
    );

    // Fetch measurements for each sensor
    for (const sensor of relevantSensors) {
      try {
        const result = await this.getSensorMeasurements(sensor.id);
        
        if (result.data && result.data.length > 0) {
          const measurement = result.data[0];
          const assessment = this.assessAirQuality(
            measurement.parameter.name,
            measurement.value
          );

          measurements.push({
            parameter: measurement.parameter.displayName || measurement.parameter.name.toUpperCase(),
            parameterCode: measurement.parameter.name,
            value: measurement.value,
            unit: measurement.parameter.units,
            timestamp: measurement.period.datetimeTo,
            quality: assessment.quality,
            level: assessment.level,
            color: assessment.color
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch measurements for sensor ${sensor.id}:`, error.message);
        // Continue with other sensors
      }
    }

    return measurements;
  }

  /**
   * Select the best station based on distance and data recency
   * @private
   */
  selectBestStation(stations) {
    // Sort by distance first, then by most recent data
    const sortedStations = stations.sort((a, b) => {
      // First priority: distance
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      
      // Second priority: most recent data
      const dateA = new Date(a.datetimeLast.utc);
      const dateB = new Date(b.datetimeLast.utc);
      return dateB - dateA;
    });

    return sortedStations[0];
  }

  /**
   * Assess air quality based on parameter and value
   * @param {string} parameter - Parameter name (pm25, pm10, no2, o3, etc.)
   * @param {number} value - Measured value
   * @returns {Object} Assessment with quality level, description, and color
   */
  assessAirQuality(parameter, value) {
    const paramLower = parameter.toLowerCase();

    // PM2.5 (µg/m³) - MOST IMPORTANT
    if (paramLower === 'pm25') {
      if (value <= 12) {
        return { quality: 'Good', level: 1, color: 'green', icon: '✅', description: 'Air quality is satisfactory, and air pollution poses little or no risk' };
      } else if (value <= 35) {
        return { quality: 'Moderate', level: 2, color: 'yellow', icon: '⚠️', description: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution' };
      } else if (value <= 55) {
        return { quality: 'Unhealthy for Sensitive Groups', level: 3, color: 'orange', icon: '⚠️', description: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected' };
      } else {
        return { quality: 'Unhealthy', level: 4, color: 'red', icon: '❌', description: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects' };
      }
    }

    // PM10 (µg/m³)
    if (paramLower === 'pm10') {
      if (value <= 54) {
        return { quality: 'Good', level: 1, color: 'green', icon: '✅', description: 'Air quality is satisfactory' };
      } else if (value <= 154) {
        return { quality: 'Moderate', level: 2, color: 'yellow', icon: '⚠️', description: 'Air quality is acceptable' };
      } else {
        return { quality: 'Unhealthy', level: 4, color: 'red', icon: '❌', description: 'Everyone may begin to experience health effects' };
      }
    }

    // NO2 (µg/m³)
    if (paramLower === 'no2') {
      if (value <= 40) {
        return { quality: 'Good', level: 1, color: 'green', icon: '✅', description: 'Air quality is satisfactory' };
      } else if (value <= 80) {
        return { quality: 'Moderate', level: 2, color: 'yellow', icon: '⚠️', description: 'Air quality is acceptable' };
      } else {
        return { quality: 'Unhealthy', level: 4, color: 'red', icon: '❌', description: 'Health effects may occur' };
      }
    }

    // O3 (µg/m³)
    if (paramLower === 'o3') {
      if (value <= 100) {
        return { quality: 'Good', level: 1, color: 'green', icon: '✅', description: 'Air quality is satisfactory' };
      } else if (value <= 160) {
        return { quality: 'Moderate', level: 2, color: 'yellow', icon: '⚠️', description: 'Air quality is acceptable' };
      } else {
        return { quality: 'Unhealthy', level: 4, color: 'red', icon: '❌', description: 'Health effects may occur' };
      }
    }

    // SO2 (µg/m³)
    if (paramLower === 'so2') {
      if (value <= 40) {
        return { quality: 'Good', level: 1, color: 'green', icon: '✅', description: 'Air quality is satisfactory' };
      } else if (value <= 80) {
        return { quality: 'Moderate', level: 2, color: 'yellow', icon: '⚠️', description: 'Air quality is acceptable' };
      } else {
        return { quality: 'Unhealthy', level: 4, color: 'red', icon: '❌', description: 'Health effects may occur' };
      }
    }

    // CO (µg/m³)
    if (paramLower === 'co') {
      if (value <= 4000) {
        return { quality: 'Good', level: 1, color: 'green', icon: '✅', description: 'Air quality is satisfactory' };
      } else if (value <= 9000) {
        return { quality: 'Moderate', level: 2, color: 'yellow', icon: '⚠️', description: 'Air quality is acceptable' };
      } else {
        return { quality: 'Unhealthy', level: 4, color: 'red', icon: '❌', description: 'Health effects may occur' };
      }
    }

    // Default for unknown parameters
    return { quality: 'Unknown', level: 0, color: 'gray', icon: '❓', description: 'Unable to assess air quality for this parameter' };
  }

  /**
   * Assess overall air quality based on all measurements
   * @private
   */
  assessOverallAirQuality(measurements) {
    if (!measurements || measurements.length === 0) {
      return {
        overallQuality: 'No Data',
        overallLevel: 0,
        overallColor: 'gray',
        overallIcon: '❓',
        primaryPollutant: null,
        description: 'No air quality data available'
      };
    }

    // Find the worst quality measurement (highest level)
    const worstMeasurement = measurements.reduce((worst, current) => {
      return current.level > worst.level ? current : worst;
    }, measurements[0]);

    // Check if we have PM2.5 data (most important)
    const pm25Measurement = measurements.find(m => m.parameterCode === 'pm25');

    return {
      overallQuality: worstMeasurement.quality,
      overallLevel: worstMeasurement.level,
      overallColor: worstMeasurement.color,
      overallIcon: worstMeasurement.icon,
      primaryPollutant: worstMeasurement.parameter,
      hasPM25: !!pm25Measurement,
      description: worstMeasurement.quality === 'Good' 
        ? 'Air quality is good. It is safe to engage in outdoor activities.'
        : `Air quality is ${worstMeasurement.quality.toLowerCase()}. Primary concern: ${worstMeasurement.parameter}.`
    };
  }

  /**
   * Get health recommendations based on air quality assessment
   * @private
   */
  getHealthRecommendations(assessment) {
    const level = assessment.overallLevel;

    const recommendations = {
      1: { // Good
        general: 'Air quality is ideal for outdoor activities.',
        sensitive: 'No health concerns for sensitive groups.',
        activities: 'All outdoor activities are recommended.'
      },
      2: { // Moderate
        general: 'Air quality is acceptable for most people.',
        sensitive: 'Unusually sensitive people should consider limiting prolonged outdoor exertion.',
        activities: 'Enjoy your usual outdoor activities.'
      },
      3: { // Unhealthy for Sensitive Groups
        general: 'General public is not likely to be affected.',
        sensitive: 'Active children and adults, and people with respiratory disease should limit prolonged outdoor exertion.',
        activities: 'Sensitive groups should reduce prolonged or heavy outdoor exertion.'
      },
      4: { // Unhealthy
        general: 'Everyone may begin to experience health effects.',
        sensitive: 'Members of sensitive groups may experience more serious health effects.',
        activities: 'Everyone should reduce prolonged or heavy outdoor exertion. Sensitive groups should avoid it entirely.'
      }
    };

    return recommendations[level] || {
      general: 'Unable to provide recommendations.',
      sensitive: 'Consult local health authorities.',
      activities: 'Check official air quality indexes.'
    };
  }

  /**
   * Format stations response
   * @private
   */
  formatStationsResponse(data, lat, lon, radius, processingTime) {
    if (!data || !data.results || data.results.length === 0) {
      return {
        success: true,
        data: [],
        metadata: {
          searchLocation: { latitude: lat, longitude: lon },
          searchRadius: radius,
          totalFound: 0,
          processingTimeMs: processingTime
        },
        requestTimestamp: new Date().toISOString()
      };
    }

    const formattedStations = data.results.map(station => ({
      id: station.id,
      name: station.name,
      distance: Math.round(station.distance * 100) / 100, // Round to 2 decimals
      coordinates: station.coordinates,
      datetimeLast: station.datetimeLast,
      sensors: station.sensors || []
    }));

    return {
      success: true,
      data: formattedStations,
      metadata: {
        searchLocation: { latitude: lat, longitude: lon },
        searchRadius: radius,
        totalFound: formattedStations.length,
        processingTimeMs: processingTime
      },
      requestTimestamp: new Date().toISOString()
    };
  }

  /**
   * Format measurements response
   * @private
   */
  formatMeasurementsResponse(data, sensorId, processingTime) {
    if (!data || !data.results || data.results.length === 0) {
      return {
        success: true,
        data: [],
        metadata: {
          sensorId: sensorId,
          totalFound: 0,
          processingTimeMs: processingTime
        },
        requestTimestamp: new Date().toISOString()
      };
    }

    const formattedMeasurements = data.results.map(measurement => {
      const assessment = this.assessAirQuality(
        measurement.parameter.name,
        measurement.value
      );

      return {
        value: measurement.value,
        parameter: {
          name: measurement.parameter.name,
          displayName: measurement.parameter.displayName || measurement.parameter.name.toUpperCase(),
          units: measurement.parameter.units
        },
        period: measurement.period,
        coverage: measurement.coverage,
        assessment: assessment
      };
    });

    return {
      success: true,
      data: formattedMeasurements,
      metadata: {
        sensorId: sensorId,
        totalFound: formattedMeasurements.length,
        processingTimeMs: processingTime
      },
      requestTimestamp: new Date().toISOString()
    };
  }

  /**
   * Validate coordinates
   * @private
   */
  validateCoordinates(lat, lon) {
    if (lat === undefined || lon === undefined) {
      const error = new Error('Latitude and longitude are required');
      error.code = 'INVALID_COORDINATES';
      error.statusCode = 400;
      throw error;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      const error = new Error('Latitude and longitude must be valid numbers');
      error.code = 'INVALID_COORDINATES';
      error.statusCode = 400;
      throw error;
    }

    if (latitude < -90 || latitude > 90) {
      const error = new Error('Latitude must be between -90 and 90');
      error.code = 'INVALID_LATITUDE';
      error.statusCode = 400;
      throw error;
    }

    if (longitude < -180 || longitude > 180) {
      const error = new Error('Longitude must be between -180 and 180');
      error.code = 'INVALID_LONGITUDE';
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Test connectivity to OpenAQ API
   * @returns {Promise<Object>} Connection status
   */
  async testConnectivity() {
    try {
      // Test with a simple locations request
      const url = `${this.baseUrl}/locations`;
      const params = {
        limit: 1
      };

      await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'X-API-Key': this.apiKey,
          'Accept': 'application/json'
        }
      });

      return {
        status: 'connected',
        message: 'OpenAQ API is accessible',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'disconnected',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle API errors
   * @private
   */
  handleApiError(error) {
    // Network or timeout error
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      const apiError = new Error('OpenAQ API request timeout');
      apiError.code = 'OPENAQ_TIMEOUT';
      apiError.statusCode = 504;
      apiError.details = { originalError: error.message };
      return apiError;
    }

    // Network connectivity error
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      const apiError = new Error('OpenAQ API is unavailable');
      apiError.code = 'OPENAQ_UNAVAILABLE';
      apiError.statusCode = 503;
      apiError.details = { originalError: error.message };
      return apiError;
    }

    // HTTP error from OpenAQ API
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        const apiError = new Error('OpenAQ API authentication failed');
        apiError.code = 'OPENAQ_AUTH_FAILED';
        apiError.statusCode = 401;
        apiError.details = data;
        return apiError;
      }

      if (status === 404) {
        const apiError = new Error('OpenAQ API endpoint not found');
        apiError.code = 'OPENAQ_NOT_FOUND';
        apiError.statusCode = 404;
        apiError.details = data;
        return apiError;
      }

      if (status === 429) {
        const apiError = new Error('OpenAQ API rate limit exceeded');
        apiError.code = 'OPENAQ_RATE_LIMIT';
        apiError.statusCode = 429;
        apiError.details = data;
        return apiError;
      }

      const apiError = new Error(data.message || 'OpenAQ API request failed');
      apiError.code = 'OPENAQ_API_ERROR';
      apiError.statusCode = status;
      apiError.details = data;
      return apiError;
    }

    // If error already has our custom format, return it
    if (error.code && error.statusCode) {
      return error;
    }

    // Unknown error
    const apiError = new Error(error.message || 'Unknown error occurred');
    apiError.code = 'OPENAQ_UNKNOWN_ERROR';
    apiError.statusCode = 500;
    apiError.details = { originalError: error.message };
    return apiError;
  }
}

module.exports = OpenaqService;
