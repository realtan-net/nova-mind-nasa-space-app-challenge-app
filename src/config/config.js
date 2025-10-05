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
  },

  nasaApi: {
    apiKey: process.env.NASA_API_KEY,
    donkiBaseUrl: process.env.NASA_DONKI_BASE_URL || 'https://api.nasa.gov/DONKI',
    timeout: parseInt(process.env.NASA_API_TIMEOUT) || 30000
  },

  noaaSwpc: {
    baseUrl: process.env.NOAA_SWPC_BASE_URL || 'https://services.swpc.noaa.gov/text',
    timeout: parseInt(process.env.NOAA_SWPC_TIMEOUT) || 30000
  },

  nasaNeows: {
    baseUrl: process.env.NASA_NEOWS_BASE_URL || 'https://api.nasa.gov/neo/rest/v1',
    apiKey: process.env.NASA_API_KEY,
    timeout: parseInt(process.env.NASA_NEOWS_TIMEOUT) || 30000,
    defaultDateRange: 7 // 7 days after start_date if end_date not provided
  },

  nasaEonet: {
    baseUrl: process.env.NASA_EONET_BASE_URL || 'https://eonet.gsfc.nasa.gov/api/v3',
    timeout: parseInt(process.env.NASA_EONET_TIMEOUT) || 30000,
    defaultLimit: 20,
    maxLimit: 100,
    defaultStatus: 'open'
  },

  openaq: {
    baseUrl: process.env.OPENAQ_BASE_URL || 'https://api.openaq.org/v3',
    apiKey: process.env.OPENAQ_API_KEY,
    timeout: parseInt(process.env.OPENAQ_TIMEOUT) || 30000,
    defaultRadius: 25000,
    defaultLimit: 10
  },

  nasaEpic: {
    baseUrl: process.env.NASA_EPIC_BASE_URL || 'https://api.nasa.gov/EPIC/api',
    archiveUrl: process.env.NASA_EPIC_ARCHIVE_URL || 'https://api.nasa.gov/EPIC/archive',
    apiKey: process.env.NASA_API_KEY,
    timeout: parseInt(process.env.NASA_EPIC_TIMEOUT) || 30000,
    imageTypes: ['natural', 'enhanced']
  },

  nasaApod: {
    baseUrl: process.env.NASA_APOD_BASE_URL || 'https://api.nasa.gov/planetary/apod',
    apiKey: process.env.NASA_API_KEY,
    timeout: parseInt(process.env.NASA_APOD_TIMEOUT) || 30000,
    maxCount: 100,
    defaultThumbsEnabled: false
  }
};

module.exports = config;
