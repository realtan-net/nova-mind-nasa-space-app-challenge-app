const { parseISO, isFuture } = require('date-fns');
const config = require('../config/config');

class WeatherDataService {
  
  /**
   * Process NASA API response and calculate daily aggregates
   * @param {Object} nasaResponse - Raw NASA API response
   * @param {string} requestDate - Original requested date
   * @param {string} dataType - 'historical' or 'prediction'
   * @param {Object} predictionMetadata - Metadata for predictions
   * @returns {Object} Processed weather data
   */
  processWeatherData(nasaResponse, requestDate, dataType = 'historical', predictionMetadata = null) {
    const startTime = Date.now();
    
    try {
      // Extract location information
      const coordinates = nasaResponse.geometry.coordinates;
      const location = {
        latitude: coordinates[1],
        longitude: coordinates[0],
        elevation: coordinates[2] || null
      };

      // Extract parameter data
      const parameterData = nasaResponse.properties.parameter;
      const parameterInfo = nasaResponse.parameters || {};
      
      // Process hourly data and calculate aggregates
      const hourlyData = {};
      const dailyAggregates = {};

      for (const [paramName, hourlyValues] of Object.entries(parameterData)) {
        // Store hourly data
        hourlyData[paramName] = hourlyValues;
        
        // Calculate daily aggregates
        const validValues = Object.values(hourlyValues)
          .filter(value => value !== config.weather.fillValue && !isNaN(value));
        
        if (validValues.length > 0) {
          const min = Math.min(...validValues);
          const max = Math.max(...validValues);
          const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
          
          dailyAggregates[paramName] = {
            min: Number(min.toFixed(2)),
            max: Number(max.toFixed(2)),
            mean: Number(mean.toFixed(2)),
            units: parameterInfo[paramName]?.units || 'unknown'
          };

          // Add prediction-specific fields
          if (dataType === 'prediction' && predictionMetadata) {
            dailyAggregates[paramName].confidence = this.calculateConfidence(validValues.length, predictionMetadata.totalDataPoints);
            dailyAggregates[paramName].standardDeviation = Number(this.calculateStandardDeviation(validValues).toFixed(2));
          }
        }
      }

      // Prepare response object
      const response = {
        location,
        date: requestDate,
        dataType,
        hourlyData,
        dailyAggregates,
        metadata: {
          source: nasaResponse.header?.api?.name || 'NASA POWER API',
          version: nasaResponse.header?.api?.version || 'unknown',
          fillValue: nasaResponse.header?.fill_value || config.weather.fillValue,
          timeStandard: nasaResponse.header?.time_standard || 'LST'
        }
      };

      // Add prediction-specific metadata
      if (dataType === 'prediction' && predictionMetadata) {
        response.predictionMethod = 'historical_average';
        response.historicalYearsUsed = predictionMetadata.yearsUsed;
        response.historicalDateRange = predictionMetadata.dateRange;
        response.predictionMetadata = {
          method: 'arithmetic_mean',
          dataPoints: predictionMetadata.totalDataPoints,
          missingDataYears: predictionMetadata.missingYears,
          reliability: this.calculateReliability(predictionMetadata.yearsUsed, predictionMetadata.totalDataPoints)
        };
      }

      const processingTime = Date.now() - startTime;
      console.log(`Weather data processed in ${processingTime}ms`);

      return response;
    } catch (error) {
      console.error('Error processing weather data:', error);
      throw new Error(`Failed to process weather data: ${error.message}`);
    }
  }

  /**
   * Calculate prediction from historical data using arithmetic mean
   * @param {Array} historicalDataArray - Array of historical weather data
   * @param {string} targetDate - Target prediction date
   * @param {Array<string>} parameters - Weather parameters to predict
   * @returns {Object} Predicted weather data in NASA API format
   */
  calculatePrediction(historicalDataArray, targetDate, parameters) {
    console.log(`Calculating prediction for ${targetDate} using ${historicalDataArray.length} years of data`);
    
    const prediction = {
      geometry: {
        type: 'Point',
        coordinates: [0, 0, 0] // Will be updated from first valid dataset
      },
      properties: {
        parameter: {}
      },
      parameters: {},
      header: {
        title: 'NASA/POWER Predicted Weather Data',
        api: { name: 'NASA Weather Prediction API', version: '1.0.0' },
        fill_value: config.weather.fillValue,
        time_standard: 'LST'
      }
    };

    // Initialize parameter objects
    for (const param of parameters) {
      prediction.properties.parameter[param] = {};
    }

    // Extract location from first valid dataset
    const firstValidData = historicalDataArray.find(item => item.data);
    if (firstValidData) {
      prediction.geometry.coordinates = firstValidData.data.geometry.coordinates;
      prediction.parameters = firstValidData.data.parameters || {};
    }

    // Calculate hourly averages for each parameter
    for (const param of parameters) {
      const hourlyAverages = {};
      
      // For each hour (00-23)
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = this.formatHourKey(targetDate, hour);
        const hourValues = [];
        
        // Collect values from all historical years for this hour
        for (const yearData of historicalDataArray) {
          if (yearData.data && yearData.data.properties.parameter[param]) {
            const historicalHourKey = this.getHistoricalHourKey(yearData.data.properties.parameter[param], hour);
            if (historicalHourKey && yearData.data.properties.parameter[param][historicalHourKey] !== undefined) {
              const value = yearData.data.properties.parameter[param][historicalHourKey];
              if (value !== config.weather.fillValue && !isNaN(value)) {
                hourValues.push(value);
              }
            }
          }
        }
        
        // Calculate arithmetic mean for this hour
        if (hourValues.length > 0) {
          const mean = hourValues.reduce((sum, val) => sum + val, 0) / hourValues.length;
          hourlyAverages[hourKey] = Number(mean.toFixed(2));
        } else {
          hourlyAverages[hourKey] = config.weather.fillValue;
        }
      }
      
      prediction.properties.parameter[param] = hourlyAverages;
    }

    // Prepare metadata
    const validYears = historicalDataArray.filter(item => item.data).map(item => item.year);
    const missingYears = historicalDataArray.filter(item => !item.data).map(item => item.year);
    
    const metadata = {
      yearsUsed: validYears.length,
      totalDataPoints: validYears.length * 24 * parameters.length,
      missingYears,
      dateRange: `${Math.min(...validYears)}-${targetDate.slice(5)} to ${Math.max(...validYears)}-${targetDate.slice(5)}`
    };

    return { prediction, metadata };
  }

  /**
   * Format hour key for target date
   * @param {string} date - YYYY-MM-DD format
   * @param {number} hour - Hour (0-23)
   * @returns {string} Formatted key like YYYYMMDDHH
   */
  formatHourKey(date, hour) {
    const dateOnly = date.replace(/-/g, '');
    return `${dateOnly}${hour.toString().padStart(2, '0')}`;
  }

  /**
   * Get corresponding hour key from historical data
   * @param {Object} parameterData - Parameter data object
   * @param {number} targetHour - Target hour (0-23)
   * @returns {string|null} Matching historical hour key
   */
  getHistoricalHourKey(parameterData, targetHour) {
    const hourStr = targetHour.toString().padStart(2, '0');
    const keys = Object.keys(parameterData);
    return keys.find(key => key.slice(-2) === hourStr);
  }

  /**
   * Calculate confidence level based on data availability
   * @param {number} availableDataPoints 
   * @param {number} totalPossibleDataPoints 
   * @returns {string} Confidence level
   */
  calculateConfidence(availableDataPoints, totalPossibleDataPoints) {
    const ratio = availableDataPoints / totalPossibleDataPoints;
    
    if (ratio >= 0.9) return 'high';
    if (ratio >= 0.7) return 'medium';
    if (ratio >= 0.5) return 'low';
    return 'very_low';
  }

  /**
   * Calculate reliability based on historical data coverage
   * @param {number} yearsUsed 
   * @param {number} totalDataPoints 
   * @returns {string} Reliability level
   */
  calculateReliability(yearsUsed, totalDataPoints) {
    if (yearsUsed >= 15 && totalDataPoints > 0) return 'high';
    if (yearsUsed >= 10) return 'medium';
    if (yearsUsed >= 5) return 'low';
    return 'very_low';
  }

  /**
   * Calculate standard deviation
   * @param {Array<number>} values 
   * @returns {number} Standard deviation
   */
  calculateStandardDeviation(values) {
    if (values.length <= 1) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Convert weather data to CSV format
   * @param {Object} weatherData - Processed weather data
   * @returns {string} CSV formatted string
   */
  convertToCSV(weatherData) {
    try {
      const lines = [];
      
      // Header
      lines.push('# NASA Weather Data Export');
      lines.push(`# Location: ${weatherData.location.latitude}, ${weatherData.location.longitude}`);
      lines.push(`# Date: ${weatherData.date}`);
      lines.push(`# Data Type: ${weatherData.dataType}`);
      lines.push('');
      
      // Daily aggregates
      lines.push('Parameter,Min,Max,Mean,Units');
      for (const [param, stats] of Object.entries(weatherData.dailyAggregates)) {
        lines.push(`${param},${stats.min},${stats.max},${stats.mean},${stats.units}`);
      }
      
      lines.push('');
      lines.push('# Hourly Data');
      
      // Hourly data header
      const parameters = Object.keys(weatherData.hourlyData);
      const hourlyHeader = ['Hour', ...parameters].join(',');
      lines.push(hourlyHeader);
      
      // Hourly data rows
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        const row = [hourStr];
        
        for (const param of parameters) {
          const hourKey = Object.keys(weatherData.hourlyData[param])[hour];
          const value = weatherData.hourlyData[param][hourKey];
          row.push(value !== undefined ? value : 'N/A');
        }
        
        lines.push(row.join(','));
      }
      
      return lines.join('\n');
    } catch (error) {
      throw new Error(`Failed to convert to CSV: ${error.message}`);
    }
  }
}

module.exports = WeatherDataService;
