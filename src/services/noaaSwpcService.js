const axios = require('axios');
const { parseISO, parse, format } = require('date-fns');
const config = require('../config/config');

/**
 * Service for NOAA Space Weather Prediction Center (SWPC) forecast data
 * Provides geomagnetic forecast data from NOAA SWPC text files
 */
class NoaaSwpcService {
  constructor() {
    this.baseUrl = config.noaaSwpc.baseUrl;
    this.timeout = config.noaaSwpc.timeout;
  }

  /**
   * Get 3-day geomagnetic forecast from NOAA SWPC
   * @returns {Promise<Object>} Formatted 3-day forecast data
   */
  async get3DayGeomagForecast() {
    const url = `${this.baseUrl}/3-day-geomag-forecast.txt`;

    try {
      console.log('Fetching NOAA SWPC 3-day geomagnetic forecast');
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'text/plain'
        }
      });

      const processingTime = Date.now() - startTime;
      const textData = response.data;

      // Parse the text data
      const parsedData = this.parse3DayForecast(textData);

      return {
        success: true,
        data: {
          source: 'NOAA SWPC 3-Day Geomagnetic Forecast',
          issued: parsedData.issued,
          forecasts: parsedData.forecasts,
          summary: this.calculateForecastSummary(parsedData.forecasts)
        },
        requestTimestamp: new Date().toISOString(),
        processingTime
      };
    } catch (error) {
      console.error('NOAA SWPC 3-day forecast request failed:', error.message);
      throw this.handleApiError(error, '3-day forecast');
    }
  }

  /**
   * Get 27-day geomagnetic outlook from NOAA SWPC
   * @returns {Promise<Object>} Formatted 27-day outlook data
   */
  async get27DayOutlook() {
    const url = `${this.baseUrl}/27-day-outlook.txt`;

    try {
      console.log('Fetching NOAA SWPC 27-day geomagnetic outlook');
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'text/plain'
        }
      });

      const processingTime = Date.now() - startTime;
      const textData = response.data;

      // Parse the text data
      const parsedData = this.parse27DayOutlook(textData);

      return {
        success: true,
        data: {
          source: 'NOAA SWPC 27-Day Geomagnetic Outlook',
          issued: parsedData.issued,
          outlooks: parsedData.outlooks,
          summary: this.calculateOutlookSummary(parsedData.outlooks)
        },
        requestTimestamp: new Date().toISOString(),
        processingTime
      };
    } catch (error) {
      console.error('NOAA SWPC 27-day outlook request failed:', error.message);
      throw this.handleApiError(error, '27-day outlook');
    }
  }

  /**
   * Get combined forecast data (3-day + 27-day)
   * @returns {Promise<Object>} Combined forecast data
   */
  async getCombinedForecast() {
    try {
      console.log('Fetching combined NOAA SWPC forecast data');
      
      const startTime = Date.now();
      
      // Fetch both forecasts in parallel
      const [forecast3Day, outlook27Day] = await Promise.all([
        this.get3DayGeomagForecast(),
        this.get27DayOutlook()
      ]);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          forecast3Day: forecast3Day.data,
          outlook27Day: outlook27Day.data,
          combinedSummary: {
            totalForecastDays: 30,
            nearTerm: forecast3Day.data.summary,
            extendedTerm: outlook27Day.data.summary
          }
        },
        requestTimestamp: new Date().toISOString(),
        processingTime
      };
    } catch (error) {
      console.error('Combined forecast request failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse 3-day geomagnetic forecast text data
   * Expected format:
   * :Issued: 2025 Oct 04 2205 UTC
   * NOAA Kp index forecast 05 Oct - 07 Oct
   *              Oct 05    Oct 06    Oct 07
   * 00-03UT        3.67      3.33      2.00
   * 
   * @param {string} textData - Raw text data from NOAA
   * @returns {Object} Parsed forecast data
   */
  parse3DayForecast(textData) {
    const lines = textData.split('\n');
    const forecast = {
      issued: null,
      forecasts: []
    };

    let dates = [];
    let kpTable = [];
    let inKpSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Extract issue date/time
      // Format: :Issued: 2025 Oct 04 2205 UTC
      const issuedMatch = trimmedLine.match(/:Issued:\s+(\d{4})\s+(\w{3})\s+(\d{2})\s+(\d{4})\s+UTC/i);
      if (issuedMatch) {
        const [, year, month, day, time] = issuedMatch;
        const dateStr = `${year}-${month}-${day} ${time}`;
        try {
          forecast.issued = parse(dateStr, 'yyyy-MMM-dd HHmm', new Date()).toISOString();
        } catch (e) {
          console.warn('Could not parse issued date:', dateStr);
        }
      }

      // Check if we're entering the Kp index section
      if (trimmedLine.includes('NOAA Kp index forecast')) {
        inKpSection = true;
        continue;
      }

      // Parse the date header line in Kp section
      // Format: "             Oct 05    Oct 06    Oct 07"
      if (inKpSection && !dates.length) {
        const dateMatches = [...trimmedLine.matchAll(/(\w{3})\s+(\d{2})/g)];
        if (dateMatches.length > 0) {
          const currentYear = new Date().getFullYear();
          dates = dateMatches.map(match => {
            const [, month, day] = match;
            try {
              const dateStr = `${currentYear}-${month}-${day}`;
              const date = parse(dateStr, 'yyyy-MMM-dd', new Date());
              return format(date, 'yyyy-MM-dd');
            } catch (e) {
              return null;
            }
          }).filter(d => d !== null);
          continue;
        }
      }

      // Parse Kp values from the table
      // Format: "00-03UT        3.67      3.33      2.00"
      if (inKpSection && dates.length > 0) {
        const kpMatch = trimmedLine.match(/^\d{2}-\d{2}UT\s+([\d.]+(?:\s+[\d.]+)*)/);
        if (kpMatch) {
          const values = kpMatch[1].trim().split(/\s+/).map(v => parseFloat(v));
          kpTable.push(values);
        }
      }

      // Stop parsing if we hit an empty line after Kp table
      if (inKpSection && kpTable.length > 0 && trimmedLine === '') {
        break;
      }
    }

    // Calculate daily averages and determine activity levels
    if (dates.length > 0 && kpTable.length > 0) {
      dates.forEach((date, dayIndex) => {
        const dailyKpValues = kpTable.map(row => row[dayIndex]).filter(v => !isNaN(v));
        if (dailyKpValues.length > 0) {
          const avgKp = dailyKpValues.reduce((a, b) => a + b, 0) / dailyKpValues.length;
          const maxKp = Math.max(...dailyKpValues);
          const minKp = Math.min(...dailyKpValues);

          forecast.forecasts.push({
            date: date,
            kpIndex: parseFloat(avgKp.toFixed(2)),
            maxKpIndex: parseFloat(maxKp.toFixed(2)),
            minKpIndex: parseFloat(minKp.toFixed(2)),
            activityLevel: this.getActivityLevel(avgKp),
            stormLevel: this.extractStormLevelFromKp(maxKp),
            kpValues: dailyKpValues.map(v => parseFloat(v.toFixed(2)))
          });
        }
      });
    }

    return forecast;
  }

  /**
   * Get activity level from Kp index
   * @param {number} kp 
   * @returns {string}
   */
  getActivityLevel(kp) {
    if (kp < 2) return 'Quiet';
    if (kp < 3) return 'Unsettled';
    if (kp < 4) return 'Unsettled';
    if (kp < 5) return 'Active';
    if (kp < 6) return 'Minor Storm';
    if (kp < 7) return 'Moderate Storm';
    if (kp < 8) return 'Strong Storm';
    if (kp < 9) return 'Severe Storm';
    return 'Extreme Storm';
  }

  /**
   * Extract storm level from Kp index value
   * @param {number} kp 
   * @returns {string|null}
   */
  extractStormLevelFromKp(kp) {
    if (kp >= 9) return 'G5-Extreme';
    if (kp >= 8) return 'G4-Severe';
    if (kp >= 7) return 'G3-Strong';
    if (kp >= 6) return 'G2-Moderate';
    if (kp >= 5) return 'G1-Minor';
    return null;
  }

  /**
   * Parse 27-day geomagnetic outlook text data
   * Expected format:
   * :Issued: 2025 Sep 29 0238 UTC
   *   UTC      Radio Flux   Planetary   Largest
   *  Date       10.7 cm      A Index    Kp Index
   * 2025 Sep 29     175          14          4
   * 
   * @param {string} textData - Raw text data from NOAA
   * @returns {Object} Parsed outlook data
   */
  parse27DayOutlook(textData) {
    const lines = textData.split('\n');
    const outlook = {
      issued: null,
      outlooks: []
    };

    let inDataSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Extract issue date/time
      // Format: :Issued: 2025 Sep 29 0238 UTC
      const issuedMatch = trimmedLine.match(/:Issued:\s+(\d{4})\s+(\w{3})\s+(\d{2})\s+(\d{4})\s+UTC/i);
      if (issuedMatch) {
        const [, year, month, day, time] = issuedMatch;
        const dateStr = `${year}-${month}-${day} ${time}`;
        try {
          outlook.issued = parse(dateStr, 'yyyy-MMM-dd HHmm', new Date()).toISOString();
        } catch (e) {
          console.warn('Could not parse issued date:', dateStr);
        }
        continue;
      }

      // Check if we're at the data table header (may have # prefix)
      if ((trimmedLine.includes('Radio Flux') && trimmedLine.includes('Kp Index')) ||
          (line.includes('Radio Flux') && line.includes('Kp Index'))) {
        inDataSection = true;
        continue;
      }

      // Parse data rows
      // Format: 2025 Oct 11     145          15          5
      if (inDataSection || trimmedLine.match(/^\d{4}\s+\w{3}\s+\d{2}/)) {
        const dataMatch = trimmedLine.match(/^(\d{4})\s+(\w{3})\s+(\d{2})\s+(\d+)\s+(\d+)\s+(\d+)/);
        if (dataMatch) {
          inDataSection = true;
          const [, year, month, day, radioFlux, aIndex, kpIndex] = dataMatch;
          const dateStr = `${year}-${month}-${day}`;
          
          try {
            const outlookDate = parse(dateStr, 'yyyy-MMM-dd', new Date());
            const kp = parseInt(kpIndex);
            
            outlook.outlooks.push({
              date: format(outlookDate, 'yyyy-MM-dd'),
              kpIndex: kp,
              aIndex: parseInt(aIndex),
              radioFlux: parseFloat(radioFlux),
              activityLevel: this.getActivityLevel(kp),
              stormLevel: this.extractStormLevelFromKp(kp)
            });
          } catch (e) {
            console.warn('Could not parse outlook date:', dateStr);
          }
        }
      }
    }

    return outlook;
  }

  /**
   * Extract storm level from description text
   * G1 = Minor, G2 = Moderate, G3 = Strong, G4 = Severe, G5 = Extreme
   * @param {string} text 
   * @returns {string|null} Storm level or null
   */
  extractStormLevel(text) {
    const stormMatch = text.match(/G([1-5])/i);
    if (stormMatch) {
      const level = stormMatch[1];
      const levels = {
        '1': 'G1-Minor',
        '2': 'G2-Moderate',
        '3': 'G3-Strong',
        '4': 'G4-Severe',
        '5': 'G5-Extreme'
      };
      return levels[level] || `G${level}`;
    }
    return null;
  }

  /**
   * Calculate summary statistics for 3-day forecast
   * @param {Array} forecasts 
   * @returns {Object} Summary statistics
   */
  calculateForecastSummary(forecasts) {
    if (!forecasts || forecasts.length === 0) {
      return {
        maxKp: 0,
        averageKp: 0,
        stormDays: 0,
        activeDays: 0
      };
    }

    const kpValues = forecasts.map(f => f.kpIndex);
    const maxKp = Math.max(...kpValues);
    const averageKp = (kpValues.reduce((a, b) => a + b, 0) / kpValues.length).toFixed(2);
    const stormDays = forecasts.filter(f => f.kpIndex >= 5).length;
    const activeDays = forecasts.filter(f => f.kpIndex >= 4 && f.kpIndex < 5).length;

    return {
      maxKp,
      averageKp: parseFloat(averageKp),
      stormDays,
      activeDays,
      totalDays: forecasts.length
    };
  }

  /**
   * Calculate summary statistics for 27-day outlook
   * @param {Array} outlooks 
   * @returns {Object} Summary statistics
   */
  calculateOutlookSummary(outlooks) {
    if (!outlooks || outlooks.length === 0) {
      return {
        maxKp: 0,
        averageKp: 0,
        stormDays: 0,
        notableEvents: 0
      };
    }

    const kpValues = outlooks.map(o => o.kpIndex);
    const maxKp = Math.max(...kpValues);
    const averageKp = (kpValues.reduce((a, b) => a + b, 0) / kpValues.length).toFixed(2);
    const stormDays = outlooks.filter(o => o.kpIndex >= 5).length;
    const notableEvents = outlooks.filter(o => o.stormLevel !== null).length;

    return {
      maxKp,
      averageKp: parseFloat(averageKp),
      stormDays,
      notableEvents,
      totalDays: outlooks.length
    };
  }

  /**
   * Handle API errors
   * @param {Error} error 
   * @param {string} dataType 
   * @returns {Error} Formatted error
   */
  handleApiError(error, dataType) {
    if (error.response) {
      const statusCode = error.response.status;
      if (statusCode >= 500) {
        return this.createError('NOAA_SWPC_UNAVAILABLE', `NOAA SWPC ${dataType} service is temporarily unavailable`, statusCode);
      } else if (statusCode === 404) {
        return this.createError('NOAA_SWPC_NOT_FOUND', `NOAA SWPC ${dataType} data not found`, statusCode);
      } else {
        return this.createError('NOAA_SWPC_ERROR', `Error fetching ${dataType}: ${error.message}`, statusCode);
      }
    } else if (error.request) {
      return this.createError('NOAA_SWPC_UNAVAILABLE', 'Unable to reach NOAA SWPC service', 503);
    } else if (error.code === 'GEOMAGNETIC_DATA_PARSE_ERROR') {
      return error;
    } else {
      return this.createError('GEOMAGNETIC_DATA_PARSE_ERROR', `Error parsing ${dataType} data: ${error.message}`, 500);
    }
  }

  /**
   * Create formatted error object
   * @param {string} code 
   * @param {string} message 
   * @param {number} statusCode 
   * @returns {Error} Error object with additional properties
   */
  createError(code, message, statusCode) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
  }

  /**
   * Test connectivity to NOAA SWPC service
   * @returns {Promise<Object>} Connection status
   */
  async testConnectivity() {
    try {
      const url = `${this.baseUrl}/3-day-geomag-forecast.txt`;
      await axios.get(url, { timeout: 5000 });

      return {
        status: 'connected',
        message: 'NOAA SWPC service is accessible',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = NoaaSwpcService;
