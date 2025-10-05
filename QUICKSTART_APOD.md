# NASA APOD (Astronomy Picture of the Day) Integration - Quick Start Guide

## Overview

The NASA APOD integration provides access to the Astronomy Picture of the Day service, offering daily astronomy images with detailed explanations. This integration follows the same patterns as other NASA API integrations in the project.

## Implementation Complete ✓

### Components Implemented

1. **Service Layer**: `src/services/nasaApodService.js`
2. **Routes**: `src/routes/apodRoutes.js`
3. **Configuration**: Updated `src/config/config.js` and `.env`
4. **Application Integration**: Updated `src/app.js`
5. **Swagger Documentation**: Updated `docs/api-spec.yaml`

## API Endpoints

### 1. Get Today's APOD
**Endpoint**: `GET /api/apod`

**Description**: Get today's Astronomy Picture of the Day

**Query Parameters**:
- `thumbs` (optional, boolean): Return video thumbnail URL (default: false)

**Example Request**:
```bash
curl "http://localhost:3000/api/apod"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "source": "NASA APOD API",
    "date": "2025-10-01",
    "title": "Astronomy Picture of the Day",
    "explanation": "Ten thousand years ago, before the dawn of recorded human history...",
    "mediaType": "image",
    "url": "https://apod.nasa.gov/apod/image/2510/WitchBroom_Meyers_1080.jpg",
    "hdurl": "https://apod.nasa.gov/apod/image/2510/WitchBroom_Meyers_6043.jpg",
    "copyright": "Brian Meyers",
    "serviceVersion": "v1"
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 234
}
```

### 2. Get APOD by Specific Date
**Endpoint**: `GET /api/apod/date/:date`

**Description**: Get APOD for a specific date

**Path Parameters**:
- `date` (required): Date in YYYY-MM-DD format

**Query Parameters**:
- `thumbs` (optional, boolean): Return video thumbnail URL (default: false)

**Example Request**:
```bash
curl "http://localhost:3000/api/apod/date/2025-10-01"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "source": "NASA APOD API",
    "requestedDate": "2025-10-01",
    "date": "2025-10-01",
    "title": "Astronomy Picture of the Day",
    "explanation": "Ten thousand years ago, before the dawn of recorded human history...",
    "mediaType": "image",
    "url": "https://apod.nasa.gov/apod/image/2510/WitchBroom_Meyers_1080.jpg",
    "hdurl": "https://apod.nasa.gov/apod/image/2510/WitchBroom_Meyers_6043.jpg",
    "copyright": "Brian Meyers",
    "serviceVersion": "v1"
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 198
}
```

### 3. Get APOD by Date Range
**Endpoint**: `GET /api/apod/range`

**Description**: Get APOD for a date range

**Query Parameters**:
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format (defaults to today)
- `thumbs` (optional, boolean): Return video thumbnail URL (default: false)

**Example Request**:
```bash
curl "http://localhost:3000/api/apod/range?start_date=2025-09-28&end_date=2025-10-01"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "source": "NASA APOD API",
    "dateRange": {
      "startDate": "2025-09-28",
      "endDate": "2025-10-01"
    },
    "totalImages": 4,
    "images": [
      {
        "date": "2025-09-28",
        "title": "...",
        "explanation": "...",
        "mediaType": "image",
        "url": "...",
        "hdurl": "...",
        "serviceVersion": "v1"
      }
    ],
    "summary": {
      "totalImages": 4,
      "byMediaType": {
        "image": 4,
        "video": 0
      }
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 456
}
```

### 4. Get Random APOD Images
**Endpoint**: `GET /api/apod/random`

**Description**: Get randomly selected APOD images

**Query Parameters**:
- `count` (optional, integer): Number of random images (1-100, default: 1)
- `thumbs` (optional, boolean): Return video thumbnail URL (default: false)

**Example Request**:
```bash
curl "http://localhost:3000/api/apod/random?count=3"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "source": "NASA APOD API",
    "requestedCount": 3,
    "actualCount": 3,
    "images": [
      {
        "date": "2018-05-15",
        "title": "...",
        "explanation": "...",
        "mediaType": "image",
        "url": "...",
        "hdurl": "...",
        "serviceVersion": "v1"
      }
    ],
    "summary": {
      "totalImages": 3,
      "byMediaType": {
        "image": 3,
        "video": 0
      }
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 312
}
```

## Error Handling

### Invalid Date Format (400)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_FORMAT",
    "message": "Invalid date format",
    "details": {
      "provided": "2025/10/05",
      "expected": "YYYY-MM-DD",
      "example": "2025-10-05"
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

### Date Out of Range (400)
```json
{
  "success": false,
  "error": {
    "code": "DATE_OUT_OF_RANGE",
    "message": "Date is outside valid range",
    "details": {
      "provided": "2030-01-01",
      "validRange": "1995-06-16 to today",
      "message": "APOD started on June 16, 1995"
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

### Invalid Date Range (400)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "Invalid date range",
    "details": {
      "startDate": "2025-10-05",
      "endDate": "2025-09-28",
      "issue": "End date must be after or equal to start date"
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

### Invalid Count Parameter (400)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_COUNT",
    "message": "Invalid count parameter",
    "details": {
      "provided": 150,
      "validRange": "1 to 100",
      "message": "Count must be between 1 and 100"
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

### NASA APOD API Unavailable (502)
```json
{
  "success": false,
  "error": {
    "code": "NASA_APOD_UNAVAILABLE",
    "message": "NASA APOD API is temporarily unavailable",
    "details": {
      "upstreamError": "Service timeout",
      "retryAfter": 300
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "error": {
    "code": "NASA_APOD_RATE_LIMIT",
    "message": "NASA APOD API rate limit exceeded",
    "details": {
      "limit": "1000 requests per hour",
      "retryAfter": 3600
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

## Data Field Explanations

### APOD Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | The date of the APOD image (YYYY-MM-DD format) |
| `title` | string | The title of the image or video |
| `explanation` | string | Detailed explanation of the astronomical phenomenon shown |
| `mediaType` | string | Type of media: "image" or "video" |
| `url` | string | URL of the standard resolution image or video embed |
| `hdurl` | string | URL of the high-definition image (only for images, not videos) |
| `copyright` | string | Copyright holder of the image (may not be present for public domain images) |
| `thumbnailUrl` | string | URL of video thumbnail (only present for videos when thumbs=true) |
| `serviceVersion` | string | Version of the APOD API service |

### Media Types

- **image**: Static image (jpg, png)
  - Has both `url` (standard) and `hdurl` (high definition)
- **video**: Video content (usually embedded YouTube videos)
  - Has `url` (video embed link)
  - May have `thumbnailUrl` if thumbs parameter is true

## Configuration

### Environment Variables (.env)

```bash
# NASA APOD (Astronomy Picture of the Day) Configuration
NASA_APOD_BASE_URL=https://api.nasa.gov/planetary/apod
NASA_APOD_TIMEOUT=30000
```

### Config File (src/config/config.js)

```javascript
nasaApod: {
  baseUrl: process.env.NASA_APOD_BASE_URL || 'https://api.nasa.gov/planetary/apod',
  apiKey: process.env.NASA_API_KEY,
  timeout: parseInt(process.env.NASA_APOD_TIMEOUT) || 30000,
  maxCount: 100,
  defaultThumbsEnabled: false
}
```

## Testing

### Using cURL

1. **Get Today's APOD**:
```bash
curl "http://localhost:3000/api/apod"
```

2. **Get APOD for Specific Date**:
```bash
curl "http://localhost:3000/api/apod/date/2025-10-01"
```

3. **Get APOD Range**:
```bash
curl "http://localhost:3000/api/apod/range?start_date=2025-09-28&end_date=2025-10-01"
```

4. **Get Random APOD**:
```bash
curl "http://localhost:3000/api/apod/random?count=3"
```

### Using Swagger UI

1. Start the server: `npm start`
2. Open Swagger UI: http://localhost:3000/api-docs
3. Navigate to "Astronomy Pictures" section
4. Try out the endpoints with the interactive interface

## API Constraints

- **Date Range**: APOD service started on June 16, 1995
- **Max Random Count**: 100 images per request
- **Rate Limit**: 1000 requests per hour with NASA API key
- **Timeout**: 30 seconds per request

## Integration in Main Application

The APOD endpoints are automatically available when you start the application:

```bash
npm start
```

The endpoints are listed at the root endpoint:
```bash
curl http://localhost:3000/
```

## Connectivity Test

The application automatically tests NASA APOD API connectivity on startup:

```
✓ NASA APOD API connection test successful
```

## Notes

- All dates must be in YYYY-MM-DD format
- The `thumbs` parameter is only relevant for video content
- Copyright information may not be present for public domain images
- HD URLs are only available for images, not videos
- Random endpoint returns images from any date in the APOD archive

## Support

For issues or questions:
- Check Swagger documentation: http://localhost:3000/api-docs
- Review error responses for detailed information
- Check NASA APOD API status: https://api.nasa.gov/

---

**Last Updated**: 2025-10-05
**Integration Status**: ✅ Complete
