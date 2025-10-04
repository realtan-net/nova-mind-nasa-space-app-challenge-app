const axios = require('axios');
const { parseISO, format, subYears, isFuture } = require('date-fns');
const config = require('../config/config');

class NasaPowerApiService {
  constructor() {
    this.baseUrl = config.nasaPowerApi.baseUrl;
    this.timeout = config.nasaPowerApi.timeout;
    this.retryAttempts = config.nasaPowerApi.retryAttempts;
    this.retryDelay = config.nasaPowerApi.retryDelay;
  }

  /**
   * Fetch weather data from NASA POWER API
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {string} startDate - YYYY-MM-DD format
   * @param {string} endDate - YYYY-MM-DD format
   * @param {Array<string>} parameters 
   * @returns {Promise<Object>} NASA API response
   */
  async fetchWeatherData(latitude, longitude, startDate, endDate, parameters) {
    const url = `${this.baseUrl}/temporal/hourly/point`;
    
    const params = {
      latitude: latitude,
      longitude: longitude,
      start: this.formatDateForApi(startDate),
      end: this.formatDateForApi(endDate),
      parameters: parameters.join(','),
      community: 'AG',
      format: 'JSON'
    };

    try {
      console.log(`Fetching NASA data for ${startDate} to ${endDate} at [${latitude}, ${longitude}]`);
      
      const response = await this.makeRequest(url, params);
      return response.data;
    } catch (error) {
      console.error('NASA API request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Fetch historical data for multiple years for prediction
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {string} targetDate - YYYY-MM-DD format
   * @param {number} historicalYears 
   * @param {Array<string>} parameters 
   * @returns {Promise<Array>} Array of historical data for each year
   */
  async fetchHistoricalDataForPrediction(latitude, longitude, targetDate, historicalYears, parameters) {
    const targetDateObj = parseISO(targetDate);
    const monthDay = format(targetDateObj, 'MM-dd');
    const historicalData = [];
    const errors = [];

    console.log(`Fetching ${historicalYears} years of historical data for prediction`);

    // Create array of promises for parallel requests
    const requests = [];
    for (let i = 1; i <= historicalYears; i++) {
      const historicalYear = new Date().getFullYear() - i;
      const historicalDate = `${historicalYear}-${monthDay}`;
      
      requests.push(
        this.fetchWeatherData(latitude, longitude, historicalDate, historicalDate, parameters)
          .then(data => ({ year: historicalYear, data, error: null }))
          .catch(error => ({ year: historicalYear, data: null, error: error.message }))
      );
    }

    // Execute all requests in parallel
    const results = await Promise.all(requests);

    // Process results
    for (const result of results) {
      if (result.error) {
        errors.push(`Year ${result.year}: ${result.error}`);
        console.warn(`Failed to fetch data for year ${result.year}:`, result.error);
      } else {
        historicalData.push({
          year: result.year,
          data: result.data
        });
      }
    }

    if (historicalData.length === 0) {
      throw new Error(`No historical data available for prediction. Errors: ${errors.join(', ')}`);
    }

    if (historicalData.length < historicalYears * 0.7) {
      console.warn(`Only ${historicalData.length} out of ${historicalYears} years of data available`);
    }

    return historicalData;
  }

  /**
   * Make HTTP request with retry logic
   * @param {string} url 
   * @param {Object} params 
   * @returns {Promise<Object>}
   */
  async makeRequest(url, params) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await axios.get(url, {
          params,
          timeout: this.timeout,
          headers: {
            'User-Agent': 'NASA-Weather-API/1.0.0',
            'Accept': 'application/json'
          }
        });

        if (response.status === 200) {
          return response;
        }
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts) {
          console.log(`Request attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Convert date from YYYY-MM-DD to YYYYMMDD format for NASA API
   * @param {string} dateString 
   * @returns {string}
   */
  formatDateForApi(dateString) {
    return dateString.replace(/-/g, '');
  }

  /**
   * Handle and normalize API errors
   * @param {Error} error 
   * @returns {Error}
   */
  handleApiError(error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      const timeoutError = new Error('NASA POWER API request timed out');
      timeoutError.code = 'API_TIMEOUT';
      timeoutError.statusCode = 504;
      return timeoutError;
    }

    if (error.response) {
      const statusCode = error.response.status;
      let message = 'NASA POWER API error';
      
      switch (statusCode) {
        case 400:
          message = 'Invalid request parameters sent to NASA API';
          break;
        case 429:
          message = 'NASA API rate limit exceeded';
          break;
        case 500:
          message = 'NASA POWER API internal server error';
          break;
        case 503:
          message = 'NASA POWER API service unavailable';
          break;
        default:
          message = `NASA POWER API error (${statusCode})`;
      }

      const apiError = new Error(message);
      apiError.code = 'EXTERNAL_API_ERROR';
      apiError.statusCode = 502;
      apiError.upstreamStatus = statusCode;
      return apiError;
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      const networkError = new Error('Unable to connect to NASA POWER API');
      networkError.code = 'NETWORK_ERROR';
      networkError.statusCode = 502;
      return networkError;
    }

    // Generic error
    const genericError = new Error('Unexpected error while fetching NASA data');
    genericError.code = 'EXTERNAL_API_ERROR';
    genericError.statusCode = 502;
    genericError.originalError = error.message;
    return genericError;
  }

  /**
   * Test NASA API connectivity
   * @returns {Promise<Object>}
   */
  async testConnectivity() {
    try {
      const testDate = '2023-01-01';
      await this.fetchWeatherData(0, 0, testDate, testDate, ['T2M']);
      return { status: 'connected', message: 'NASA POWER API is accessible' };
    } catch (error) {
      return { 
        status: 'disconnected', 
        message: 'NASA POWER API is not accessible',
        error: error.message 
      };
    }
  }

  /**
   * Utility delay function
   * @param {number} ms 
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = NasaPowerApiService;
