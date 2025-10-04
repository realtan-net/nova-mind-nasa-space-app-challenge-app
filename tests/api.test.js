const request = require('supertest');
const App = require('../src/app');

describe('NASA Weather API', () => {
  let app;

  beforeAll(() => {
    const appInstance = new App();
    app = appInstance.getApp();
  });

  describe('GET /', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('NASA Weather Data API');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
    });
  });

  describe('GET /api/weather/parameters', () => {
    test('should return available parameters', async () => {
      const response = await request(app)
        .get('/api/weather/parameters')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.availableParameters).toBeInstanceOf(Array);
      expect(response.body.data.parameterDetails).toBeDefined();
    });
  });

  describe('GET /api/weather/data', () => {
    test('should return weather data for valid request', async () => {
      const response = await request(app)
        .get('/api/weather/data')
        .query({
          latitude: 41,
          longitude: 29,
          date: '2023-01-01',
          parameters: 'T2M,RH2M'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toBeDefined();
      expect(response.body.data.date).toBe('2023-01-01');
      expect(response.body.data.dataType).toBe('historical');
    }, 30000); // 30 second timeout for NASA API calls

    test('should return validation error for invalid latitude', async () => {
      const response = await request(app)
        .get('/api/weather/data')
        .query({
          latitude: 95,
          longitude: 29,
          date: '2023-01-01'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return validation error for invalid date format', async () => {
      const response = await request(app)
        .get('/api/weather/data')
        .query({
          latitude: 41,
          longitude: 29,
          date: '2023/01/01'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/weather/historical-range', () => {
    test('should return date ranges for valid coordinates', async () => {
      const response = await request(app)
        .get('/api/weather/historical-range')
        .query({
          latitude: 41,
          longitude: 29
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.historicalRange).toBeDefined();
      expect(response.body.data.predictionRange).toBeDefined();
    });
  });

  describe('POST /api/weather/bulk', () => {
    test('should process bulk request successfully', async () => {
      const bulkRequest = {
        requests: [
          {
            latitude: 41,
            longitude: 29,
            date: '2023-01-01',
            parameters: 'T2M'
          }
        ],
        historicalYears: 10
      };

      const response = await request(app)
        .post('/api/weather/bulk')
        .send(bulkRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRequests).toBe(1);
    }, 30000);

    test('should return validation error for empty requests', async () => {
      const bulkRequest = {
        requests: []
      };

      const response = await request(app)
        .post('/api/weather/bulk')
        .send(bulkRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error handling', () => {
    test('should return 404 for non-existent route', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
