const axios = require('axios');
const { parseISO, differenceInHours, differenceInDays } = require('date-fns');
const config = require('../config/config');

/**
 * Service for NASA EONET (Earth Observatory Natural Event Tracker) API
 * Provides real-time natural disaster event monitoring and tracking
 */
class NasaEonetService {
  constructor() {
    this.baseUrl = config.nasaEonet.baseUrl;
    this.timeout = config.nasaEonet.timeout;
    this.defaultLimit = config.nasaEonet.defaultLimit;
    this.maxLimit = config.nasaEonet.maxLimit;
    this.defaultStatus = config.nasaEonet.defaultStatus;
    
    // Valid event categories
    this.validCategories = [
      'drought', 'dustHaze', 'earthquakes', 'floods', 'landslides',
      'manmade', 'seaLakeIce', 'severeStorms', 'snow', 'tempExtremes',
      'volcanoes', 'waterColor', 'wildfires'
    ];
  }

  /**
   * Get all event categories
   * @returns {Promise<Object>} Formatted categories data
   */
  async getCategories() {
    const url = `${this.baseUrl}/categories`;

    try {
      console.log('Fetching NASA EONET categories');
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;

      return this.formatCategoriesResponse(response.data, processingTime);
    } catch (error) {
      console.error('NASA EONET categories request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get events with filters
   * @param {Object} filters - Query filters (status, limit, category, bbox, start, end)
   * @returns {Promise<Object>} Formatted events data
   */
  async getEvents(filters = {}) {
    const { status, limit, category, bbox, start, end } = filters;

    // Validate filters
    this.validateFilters(filters);

    const url = `${this.baseUrl}/events`;
    const params = {};

    if (status) params.status = status;
    if (limit) params.limit = limit;
    if (category) params.category = category;
    if (bbox) params.bbox = bbox;
    if (start) params.start = start;
    if (end) params.end = end;

    try {
      console.log('Fetching NASA EONET events with filters:', params);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;

      return this.formatEventResponse(response.data, filters, processingTime);
    } catch (error) {
      console.error('NASA EONET events request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get events in GeoJSON format
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Events in GeoJSON format
   */
  async getEventsGeoJSON(filters = {}) {
    const { status, limit, category } = filters;

    // Validate filters
    this.validateFilters(filters);

    const url = `${this.baseUrl}/events/geojson`;
    const params = {};

    if (status) params.status = status;
    if (limit) params.limit = limit;
    if (category) params.category = category;

    try {
      console.log('Fetching NASA EONET events in GeoJSON format with filters:', params);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        params,
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;

      // Return GeoJSON directly with metadata
      return {
        success: true,
        data: response.data,
        filters: params,
        requestTimestamp: new Date().toISOString(),
        processingTime
      };
    } catch (error) {
      console.error('NASA EONET GeoJSON request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get specific event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Event details
   */
  async getEventById(eventId) {
    if (!eventId) {
      throw this.createError('EVENT_ID_REQUIRED', 'Event ID is required', 400);
    }

    const url = `${this.baseUrl}/events/${eventId}`;

    try {
      console.log(`Fetching NASA EONET event: ${eventId}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: this.transformEvent(response.data),
        requestTimestamp: new Date().toISOString(),
        processingTime
      };
    } catch (error) {
      console.error('NASA EONET event request failed:', error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Validate query filters
   * @param {Object} filters 
   */
  validateFilters(filters) {
    const { status, limit, category, bbox, start, end } = filters;

    // Validate status
    if (status && !['open', 'closed'].includes(status)) {
      throw this.createError(
        'INVALID_STATUS',
        'Invalid status. Must be "open" or "closed"',
        400,
        { provided: status, valid: ['open', 'closed'] }
      );
    }

    // Validate limit
    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > this.maxLimit) {
        throw this.createError(
          'LIMIT_EXCEEDED',
          'Requested limit exceeds maximum allowed',
          400,
          { requested: limit, maximum: this.maxLimit }
        );
      }
    }

    // Validate category
    if (category && !this.validCategories.includes(category)) {
      throw this.createError(
        'INVALID_CATEGORY',
        'Invalid category ID provided',
        400,
        { provided: category, validCategories: this.validCategories }
      );
    }

    // Validate bbox format
    if (bbox) {
      const bboxParts = bbox.split(',');
      if (bboxParts.length !== 4 || bboxParts.some(p => isNaN(parseFloat(p)))) {
        throw this.createError(
          'INVALID_BBOX_FORMAT',
          'Invalid bounding box format',
          400,
          {
            provided: bbox,
            expected: 'minLon,minLat,maxLon,maxLat',
            example: '26.5,38.0,28.0,39.0'
          }
        );
      }
    }

    // Validate date range
    if (start && end) {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
      
      if (endDate < startDate) {
        throw this.createError(
          'INVALID_DATE_RANGE',
          'Invalid date range provided',
          400,
          {
            startDate: start,
            endDate: end,
            issue: 'End date must be after start date'
          }
        );
      }
    }
  }

  /**
   * Format categories response
   * @param {Object} rawData 
   * @param {number} processingTime 
   * @returns {Object}
   */
  formatCategoriesResponse(rawData, processingTime) {
    const categories = rawData.categories.map(cat => ({
      id: cat.id,
      title: cat.title,
      description: cat.description,
      link: cat.link,
      layersUrl: cat.layers
    }));

    return {
      success: true,
      data: {
        source: 'NASA EONET API',
        totalCategories: categories.length,
        categories
      },
      requestTimestamp: new Date().toISOString(),
      processingTime
    };
  }

  /**
   * Format event response
   * @param {Object} rawData 
   * @param {Object} filters 
   * @param {number} processingTime 
   * @returns {Object}
   */
  formatEventResponse(rawData, filters, processingTime) {
    const events = rawData.events.map(event => this.transformEvent(event, filters));

    // Calculate summary statistics
    const summary = this.calculateEventStatistics(events, filters);

    return {
      success: true,
      data: {
        source: 'NASA EONET API',
        ...(filters.category && {
          category: {
            id: filters.category,
            title: this.getCategoryTitle(filters.category)
          }
        }),
        ...(filters.bbox && filters.userLat && filters.userLon && {
          region: {
            bbox: this.parseBbox(filters.bbox),
            userLocation: {
              latitude: parseFloat(filters.userLat),
              longitude: parseFloat(filters.userLon)
            }
          }
        }),
        ...(filters.start && filters.end && {
          dateRange: {
            start: filters.start,
            end: filters.end
          }
        }),
        filters: {
          status: filters.status || this.defaultStatus,
          limit: filters.limit || this.defaultLimit,
          ...(filters.category && { category: filters.category }),
          ...(filters.bbox && { bbox: filters.bbox })
        },
        totalEvents: events.length,
        events,
        summary
      },
      requestTimestamp: new Date().toISOString(),
      processingTime
    };
  }

  /**
   * Transform single event object
   * @param {Object} event 
   * @param {Object} filters 
   * @returns {Object}
   */
  transformEvent(event, filters = {}) {
    // Get latest geometry point
    const latestGeometry = event.geometry && event.geometry.length > 0
      ? event.geometry[event.geometry.length - 1]
      : null;

    // Base transformed event
    const transformed = {
      id: event.id,
      title: event.title,
      description: event.description,
      link: event.link,
      status: event.closed ? 'closed' : 'open',
      closedDate: event.closed || null,
      categories: event.categories,
      sources: event.sources
    };

    // For analysis endpoint (trend analysis)
    if (filters.start && filters.end && event.geometry && event.geometry.length > 1) {
      transformed.timeline = event.geometry.map(g => ({
        date: g.date,
        coordinates: {
          longitude: g.coordinates[0],
          latitude: g.coordinates[1]
        },
        magnitude: {
          value: g.magnitudeValue,
          unit: g.magnitudeUnit
        }
      }));

      transformed.trendAnalysis = this.analyzeStormTrend(event.geometry);
      transformed.currentMagnitude = this.formatMagnitude(latestGeometry);
      transformed.lastUpdate = latestGeometry?.date;
    }
    // For regional endpoint (with proximity)
    else if (filters.userLat && filters.userLon && latestGeometry) {
      transformed.location = {
        longitude: latestGeometry.coordinates[0],
        latitude: latestGeometry.coordinates[1]
      };
      transformed.magnitude = this.formatMagnitude(latestGeometry);
      transformed.lastUpdate = latestGeometry.date;
      transformed.dataAge = this.calculateDataAge(latestGeometry.date);
      transformed.proximityToUser = this.calculateProximity(
        parseFloat(filters.userLat),
        parseFloat(filters.userLon),
        latestGeometry.coordinates[1],
        latestGeometry.coordinates[0]
      );
    }
    // For category endpoint
    else if (filters.category) {
      transformed.location = latestGeometry ? {
        longitude: latestGeometry.coordinates[0],
        latitude: latestGeometry.coordinates[1]
      } : null;
      transformed.magnitude = this.formatMagnitude(latestGeometry);
      transformed.lastUpdate = latestGeometry?.date;
      transformed.dataAge = latestGeometry ? this.calculateDataAge(latestGeometry.date) : null;
    }
    // For general events endpoint
    else {
      transformed.geometry = event.geometry?.map(g => ({
        date: g.date,
        type: g.type,
        coordinates: {
          longitude: g.coordinates[0],
          latitude: g.coordinates[1]
        },
        magnitude: {
          value: g.magnitudeValue,
          unit: g.magnitudeUnit
        }
      }));
      transformed.currentMagnitude = this.formatMagnitude(latestGeometry);
      transformed.lastUpdate = latestGeometry?.date;
      transformed.isStaleData = latestGeometry ? this.isStaleData(latestGeometry.date) : false;
    }

    return transformed;
  }

  /**
   * Calculate event statistics
   * @param {Array} events 
   * @param {Object} filters 
   * @returns {Object}
   */
  calculateEventStatistics(events, filters) {
    const summary = {
      totalEvents: events.length
    };

    // No events found
    if (events.length === 0) {
      summary.message = 'No events found matching the specified criteria';
      return summary;
    }

    // Category distribution
    if (!filters.category) {
      const byCategory = {};
      events.forEach(event => {
        event.categories.forEach(cat => {
          byCategory[cat.id] = (byCategory[cat.id] || 0) + 1;
        });
      });
      summary.byCategory = byCategory;
    }

    // Calculate average magnitude
    const magnitudes = events
      .map(e => e.currentMagnitude || e.magnitude)
      .filter(m => m && m.value !== null);

    if (magnitudes.length > 0) {
      const byUnit = {};
      magnitudes.forEach(m => {
        if (!byUnit[m.unit]) byUnit[m.unit] = [];
        byUnit[m.unit].push(m.value);
      });

      summary.averageMagnitude = {};
      Object.keys(byUnit).forEach(unit => {
        const values = byUnit[unit];
        summary.averageMagnitude[unit] = 
          values.reduce((a, b) => a + b, 0) / values.length;
      });
    }

    // For category endpoint (wildfires)
    if (filters.category === 'wildfires') {
      const totalAcres = events
        .map(e => e.magnitude?.value)
        .filter(v => v !== null && v !== undefined)
        .reduce((sum, val) => sum + val, 0);
      
      summary.totalAcresBurned = totalAcres;
      summary.staleDataEvents = events.filter(e => e.dataAge?.isStale).length;
      summary.activeEvents = events.filter(e => e.status === 'open').length;
    }

    // For regional endpoint
    if (filters.userLat && filters.userLon) {
      const byRiskLevel = {
        high: events.filter(e => e.proximityToUser?.riskLevel === 'HIGH').length,
        medium: events.filter(e => e.proximityToUser?.riskLevel === 'MEDIUM').length,
        low: events.filter(e => e.proximityToUser?.riskLevel === 'LOW').length
      };
      summary.byRiskLevel = byRiskLevel;

      // Find nearest event
      const eventsWithDistance = events
        .filter(e => e.proximityToUser?.distanceKm)
        .sort((a, b) => a.proximityToUser.distanceKm - b.proximityToUser.distanceKm);

      if (eventsWithDistance.length > 0) {
        const nearest = eventsWithDistance[0];
        summary.nearestEvent = {
          id: nearest.id,
          title: nearest.title,
          distanceKm: nearest.proximityToUser.distanceKm,
          riskLevel: nearest.proximityToUser.riskLevel
        };
      }
    }

    // For analysis endpoint
    if (filters.start && filters.end) {
      const trendDistribution = {
        strengthening: events.filter(e => e.trendAnalysis?.trend === 'strengthening').length,
        weakening: events.filter(e => e.trendAnalysis?.trend === 'weakening').length,
        stable: events.filter(e => e.trendAnalysis?.trend === 'stable').length
      };
      summary.trendDistribution = trendDistribution;

      const peakMagnitudes = events
        .map(e => e.trendAnalysis?.magnitudeChange?.peak)
        .filter(p => p !== null && p !== undefined);
      
      if (peakMagnitudes.length > 0) {
        summary.averagePeakMagnitude = 
          peakMagnitudes.reduce((a, b) => a + b, 0) / peakMagnitudes.length;
      }

      const startDate = parseISO(filters.start);
      const endDate = parseISO(filters.end);
      summary.dateRangeCoverage = `${differenceInDays(endDate, startDate) + 1} days`;
    }

    return summary;
  }

  /**
   * Analyze storm trend from geometry data
   * @param {Array} geometry 
   * @returns {Object}
   */
  analyzeStormTrend(geometry) {
    if (!geometry || geometry.length < 2) {
      return { trend: 'stable', trendLabel: 'Trend: stable' };
    }

    const magnitudes = geometry
      .map(g => g.magnitudeValue)
      .filter(m => m !== null && m !== undefined);

    if (magnitudes.length < 2) {
      return { trend: 'stable', trendLabel: 'Trend: stable' };
    }

    const initial = magnitudes[0];
    const peak = Math.max(...magnitudes);
    const final = magnitudes[magnitudes.length - 1];
    const totalChange = final - initial;
    const percentageChange = ((final - initial) / initial) * 100;

    // Calculate timeline arrows
    const timelineArrows = [];
    for (let i = 0; i < geometry.length - 1; i++) {
      const curr = geometry[i];
      const next = geometry[i + 1];
      
      if (curr.magnitudeValue !== null && next.magnitudeValue !== null) {
        const change = next.magnitudeValue - curr.magnitudeValue;
        let direction = '→';
        if (change > 0) direction = '↑';
        else if (change < 0) direction = '↓';

        timelineArrows.push({
          from: curr.date,
          to: next.date,
          direction,
          change: `${change >= 0 ? '+' : ''}${change} ${curr.magnitudeUnit || ''}`
        });
      }
    }

    // Determine trend
    let trend = 'stable';
    if (totalChange > initial * 0.1) trend = 'strengthening';
    else if (totalChange < -initial * 0.1) trend = 'weakening';

    // Calculate average change per interval
    const avgChange = totalChange / (magnitudes.length - 1);

    return {
      trend,
      trendLabel: `Trend: ${trend}`,
      magnitudeChange: {
        initial,
        peak,
        final,
        totalIncrease: totalChange,
        percentageChange: parseFloat(percentageChange.toFixed(2))
      },
      timelineArrows,
      averageChangePerInterval: parseFloat(avgChange.toFixed(1)),
      isIntensifying: trend === 'strengthening'
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return parseFloat(distance.toFixed(2));
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees 
   * @returns {number}
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate proximity to user location
   * @param {number} userLat 
   * @param {number} userLon 
   * @param {number} eventLat 
   * @param {number} eventLon 
   * @returns {Object}
   */
  calculateProximity(userLat, userLon, eventLat, eventLon) {
    const distanceKm = this.calculateDistance(userLat, userLon, eventLat, eventLon);
    const distanceMiles = parseFloat((distanceKm * 0.621371).toFixed(2));
    const riskLevel = this.classifyRiskLevel(distanceKm);

    return {
      distanceKm,
      distanceMiles,
      riskLevel: riskLevel.level,
      riskDescription: riskLevel.description,
      alert: riskLevel.alert
    };
  }

  /**
   * Classify risk level based on distance
   * @param {number} distanceKm 
   * @returns {Object}
   */
  classifyRiskLevel(distanceKm) {
    if (distanceKm < 50) {
      return {
        level: 'HIGH',
        description: '<50 km: High Risk',
        alert: 'Nearby active wildfire'
      };
    } else if (distanceKm < 150) {
      return {
        level: 'MEDIUM',
        description: '50-150 km: Medium Risk',
        alert: 'Wildfire in surrounding area'
      };
    } else {
      return {
        level: 'LOW',
        description: '>150 km: Low Risk',
        alert: 'Distant wildfire detected'
      };
    }
  }

  /**
   * Format magnitude object
   * @param {Object} geometry 
   * @returns {Object}
   */
  formatMagnitude(geometry) {
    if (!geometry) {
      return {
        value: null,
        unit: null,
        label: 'Unknown'
      };
    }

    return {
      value: geometry.magnitudeValue,
      unit: geometry.magnitudeUnit,
      label: geometry.magnitudeValue !== null && geometry.magnitudeUnit
        ? `${geometry.magnitudeValue} ${geometry.magnitudeUnit}`
        : 'Unknown'
    };
  }

  /**
   * Calculate data age
   * @param {string} lastUpdateDate 
   * @returns {Object}
   */
  calculateDataAge(lastUpdateDate) {
    const now = new Date();
    const updateDate = parseISO(lastUpdateDate);
    const hours = differenceInHours(now, updateDate);
    const isStale = hours > 48;

    return {
      hours,
      isStale,
      staleSince: isStale ? new Date(updateDate.getTime() + 48 * 60 * 60 * 1000).toISOString() : null
    };
  }

  /**
   * Check if data is stale (>48 hours old)
   * @param {string} lastUpdateDate 
   * @returns {boolean}
   */
  isStaleData(lastUpdateDate) {
    const now = new Date();
    const updateDate = parseISO(lastUpdateDate);
    const hours = differenceInHours(now, updateDate);
    return hours > 48;
  }

  /**
   * Parse bbox string to object
   * @param {string} bbox 
   * @returns {Object}
   */
  parseBbox(bbox) {
    const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(parseFloat);
    return {
      minLongitude: minLon,
      minLatitude: minLat,
      maxLongitude: maxLon,
      maxLatitude: maxLat
    };
  }

  /**
   * Get category title by ID
   * @param {string} categoryId 
   * @returns {string}
   */
  getCategoryTitle(categoryId) {
    const titles = {
      drought: 'Drought',
      dustHaze: 'Dust and Haze',
      earthquakes: 'Earthquakes',
      floods: 'Floods',
      landslides: 'Landslides',
      manmade: 'Manmade',
      seaLakeIce: 'Sea and Lake Ice',
      severeStorms: 'Severe Storms',
      snow: 'Snow',
      tempExtremes: 'Temperature Extremes',
      volcanoes: 'Volcanoes',
      waterColor: 'Water Color',
      wildfires: 'Wildfires'
    };
    return titles[categoryId] || categoryId;
  }

  /**
   * Test connectivity to NASA EONET API
   * @returns {Promise<Object>}
   */
  async testConnectivity() {
    try {
      const response = await axios.get(`${this.baseUrl}/categories`, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });

      return {
        status: 'connected',
        statusCode: response.status,
        message: 'NASA EONET API is accessible'
      };
    } catch (error) {
      return {
        status: 'error',
        statusCode: error.response?.status || 500,
        message: error.message
      };
    }
  }

  /**
   * Create a standardized error object
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Additional error details
   * @returns {Error}
   */
  createError(code, message, statusCode = 500, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  /**
   * Handle API errors
   * @param {Error} error - The error to handle
   * @returns {Error}
   */
  handleApiError(error) {
    if (error.code) {
      return error;
    }

    if (error.response) {
      const statusCode = error.response.status;
      const message = error.response.data?.message || error.message;

      if (statusCode === 404) {
        return this.createError(
          'EVENT_NOT_FOUND',
          'Event not found',
          404,
          { originalError: message }
        );
      }

      if (statusCode === 400) {
        return this.createError(
          'INVALID_REQUEST',
          'Invalid request parameters',
          400,
          { originalError: message }
        );
      }

      if (statusCode >= 500) {
        return this.createError(
          'NASA_EONET_UNAVAILABLE',
          'NASA EONET API is temporarily unavailable',
          502,
          { upstreamError: message, retryAfter: 300 }
        );
      }

      return this.createError(
        'NASA_EONET_ERROR',
        message,
        statusCode,
        { originalError: error.response.data }
      );
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return this.createError(
        'NASA_EONET_TIMEOUT',
        'NASA EONET API request timeout',
        504,
        { timeout: this.timeout }
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return this.createError(
        'NASA_EONET_UNAVAILABLE',
        'NASA EONET API is temporarily unavailable',
        502,
        { upstreamError: error.message, retryAfter: 300 }
      );
    }

    return this.createError(
      'NASA_EONET_ERROR',
      error.message || 'Unknown error occurred',
      500,
      { originalError: error.message }
    );
  }
}

module.exports = NasaEonetService;
