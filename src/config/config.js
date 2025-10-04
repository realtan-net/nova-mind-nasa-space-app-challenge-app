const config = {
  server: {
    port: process.env.PORT || 3000,
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 60000,
    env: process.env.NODE_ENV || 'development'
  },
  
  nasaPowerApi: {
    baseUrl: process.env.NASA_POWER_API_BASE_URL || 'https://power.larc.nasa.gov/api',
    timeout: parseInt(process.env.NASA_POWER_API_TIMEOUT) || 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  weather: {
    defaultHistoricalYears: parseInt(process.env.DEFAULT_HISTORICAL_YEARS) || 20,
    maxHistoricalYears: parseInt(process.env.MAX_HISTORICAL_YEARS) || 30,
    minHistoricalYears: parseInt(process.env.MIN_HISTORICAL_YEARS) || 5,
    defaultParameters: ['T2M', 'RH2M', 'WS10M', 'WD10M', 'PS', 'ALLSKY_SFC_SW_DWN'],
    maxParametersPerRequest: 20,
    fillValue: -999.0
  },
  
  validation: {
    minLatitude: -90,
    maxLatitude: 90,
    minLongitude: -180,
    maxLongitude: 180,
    minDate: '1981-01-01',
    maxFutureYears: 10,
    datePattern: /^\d{4}-\d{2}-\d{2}$/
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;
