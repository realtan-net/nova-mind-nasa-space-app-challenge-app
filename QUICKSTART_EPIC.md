# NASA EPIC (Earth Polychromatic Imaging Camera) Integration - Quick Start Guide

## Overview

NASA EPIC integration provides full-disk Earth imagery from the DSCOVR spacecraft. The EPIC camera captures natural and enhanced color images of Earth approximately every 2 hours.

## Implementation Status: ✅ COMPLETE

All components have been successfully integrated following the project's modular architecture.

## Components Implemented

### 1. Configuration (`src/config/config.js`)
- ✅ NASA EPIC base URL configuration
- ✅ Archive URL configuration
- ✅ API key integration (uses existing NASA_API_KEY)
- ✅ Timeout settings
- ✅ Image types configuration

### 2. Service Layer (`src/services/nasaEpicService.js`)
- ✅ `getNaturalImages()` - Get latest natural color images
- ✅ `getNaturalImagesByDate(date)` - Get natural images by specific date
- ✅ `getNaturalAvailableDates()` - Get all available dates for natural images
- ✅ `getEnhancedImages()` - Get latest enhanced color images
- ✅ `getEnhancedImagesByDate(date)` - Get enhanced images by specific date
- ✅ `getEnhancedAvailableDates()` - Get all available dates for enhanced images
- ✅ Image URL generation (PNG and JPG formats)
- ✅ Date validation and parsing
- ✅ Comprehensive error handling
- ✅ Connectivity testing

### 3. Route Handler (`src/routes/epicRoutes.js`)
- ✅ `GET /api/epic/natural/images` - Latest natural color images
- ✅ `GET /api/epic/natural/images/date/:date` - Natural images by date
- ✅ `GET /api/epic/natural/dates` - Available dates for natural images
- ✅ `GET /api/epic/enhanced/images` - Latest enhanced color images
- ✅ `GET /api/epic/enhanced/images/date/:date` - Enhanced images by date
- ✅ `GET /api/epic/enhanced/dates` - Available dates for enhanced images

### 4. Application Integration (`src/app.js`)
- ✅ Route registration
- ✅ Root endpoint updated with EPIC endpoints
- ✅ API info endpoint updated
- ✅ NASA EPIC connectivity test added

### 5. Swagger Documentation (`docs/api-spec.yaml`)
- ✅ "Earth Imagery" tag added
- ✅ All 6 endpoint paths documented
- ✅ Request/response schemas defined
- ✅ Error response examples
- ✅ Complete OpenAPI 3.0 specification

### 6. Environment Configuration (`.env`)
- ✅ NASA_EPIC_BASE_URL
- ✅ NASA_EPIC_ARCHIVE_URL
- ✅ NASA_EPIC_TIMEOUT

## API Endpoints

### Natural Color Imagery

#### 1. Get Latest Natural Color Images
```bash
GET http://localhost:3000/api/epic/natural/images
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "source": "NASA EPIC API",
    "imageType": "natural",
    "totalImages": 1,
    "images": [
      {
        "identifier": "20251005011359",
        "imageName": "epic_1b_20251005011359",
        "caption": "This image was taken by NASA's EPIC camera onboard the NOAA DSCOVR spacecraft",
        "version": "03",
        "date": "2025-10-05 01:13:59",
        "downloadUrl": "https://api.nasa.gov/EPIC/archive/natural/2025/10/05/png/epic_1b_20251005011359.png?api_key=KEY",
        "thumbnailUrl": "https://api.nasa.gov/EPIC/archive/natural/2025/10/05/jpg/epic_1b_20251005011359.jpg?api_key=KEY",
        "centroidCoordinates": {
          "latitude": 5.25,
          "longitude": -157.5
        }
      }
    ]
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 234
}
```

#### 2. Get Natural Color Images by Date
```bash
GET http://localhost:3000/api/epic/natural/images/date/2025-10-05
```

#### 3. Get All Available Dates (Natural Color)
```bash
GET http://localhost:3000/api/epic/natural/dates
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "source": "NASA EPIC API",
    "imageType": "natural",
    "totalDates": 2456,
    "dateRange": {
      "earliest": "2015-06-13",
      "latest": "2025-10-05"
    },
    "dates": ["2015-06-13", "2015-06-14", "...", "2025-10-05"]
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 312
}
```

### Enhanced Color Imagery

#### 4. Get Latest Enhanced Color Images
```bash
GET http://localhost:3000/api/epic/enhanced/images
```

#### 5. Get Enhanced Color Images by Date
```bash
GET http://localhost:3000/api/epic/enhanced/images/date/2025-10-05
```

#### 6. Get All Available Dates (Enhanced Color)
```bash
GET http://localhost:3000/api/epic/enhanced/dates
```

## Testing

### Manual Testing with curl

```bash
# Test latest natural color images
curl "http://localhost:3000/api/epic/natural/images"

# Test images by date
curl "http://localhost:3000/api/epic/natural/images/date/2025-10-05"

# Test available dates
curl "http://localhost:3000/api/epic/natural/dates"

# Test enhanced color images
curl "http://localhost:3000/api/epic/enhanced/images"

# Test enhanced images by date
curl "http://localhost:3000/api/epic/enhanced/images/date/2025-10-05"

# Test enhanced available dates
curl "http://localhost:3000/api/epic/enhanced/dates"
```

### Swagger UI Testing

1. Start the server:
   ```bash
   npm start
   ```

2. Open Swagger UI:
   ```
   http://localhost:3000/api-docs
   ```

3. Navigate to the "Earth Imagery" section

4. Test each endpoint using the "Try it out" button

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

### No Images Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NO_IMAGES_FOUND",
    "message": "No images found for the specified date",
    "details": {
      "requestedDate": "2025-10-05",
      "imageType": "natural",
      "suggestion": "Try another date or check available dates endpoint"
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
    "code": "NASA_EPIC_RATE_LIMIT",
    "message": "NASA EPIC API rate limit exceeded",
    "details": {
      "limit": "1000 requests per hour",
      "retryAfter": 3600
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

### NASA EPIC API Unavailable (502)
```json
{
  "success": false,
  "error": {
    "code": "NASA_EPIC_UNAVAILABLE",
    "message": "NASA EPIC API is temporarily unavailable",
    "details": {
      "upstreamError": "Service timeout",
      "retryAfter": 300
    }
  },
  "requestTimestamp": "2025-10-05T12:00:00Z"
}
```

## Image Data Details

### Image Metadata Fields

- **identifier**: Unique identifier (e.g., "20251005011359")
- **imageName**: Image file name without extension
- **caption**: Image description
- **version**: Processing version number (e.g., "03")
- **date**: Capture date and time
- **downloadUrl**: Full-resolution PNG download URL
- **thumbnailUrl**: Thumbnail JPG download URL
- **centroidCoordinates**: Earth center coordinates in the image
  - latitude: Degrees
  - longitude: Degrees
- **spacecraftPosition**: J2000 coordinate system positions (km)
  - dscovr: DSCOVR spacecraft position
  - lunar: Moon position
  - sun: Sun position
- **attitudeQuaternions**: Spacecraft orientation quaternions

### Image URL Format

**PNG (Full Resolution):**
```
https://api.nasa.gov/EPIC/archive/{imageType}/YYYY/MM/DD/png/{imageName}.png?api_key=KEY
```

**JPG (Thumbnail):**
```
https://api.nasa.gov/EPIC/archive/{imageType}/YYYY/MM/DD/jpg/{imageName}.jpg?api_key=KEY
```

## Startup Verification

When the server starts, you should see:

```
🚀 NASA Weather Data API Server Started
==================================================
📡 Server running on port 3000
🌍 Environment: development
📚 API Documentation: http://localhost:3000/api-docs
🏥 Health Check: http://localhost:3000/api/health
🌤️  Weather Data: http://localhost:3000/api/weather/data
==================================================
✓ NASA POWER API connection test successful
✓ NASA DONKI API connection test successful
✓ NOAA SWPC service connection test successful
✓ NASA NeoWs API connection test successful
✓ NASA EONET API connection test successful
✓ OpenAQ API connection test successful
✓ NASA EPIC API connection test successful
```

## Data Sources

- **NASA EPIC API**: https://epic.gsfc.nasa.gov/
- **DSCOVR Spacecraft**: Deep Space Climate Observatory
- **Image Frequency**: Approximately every 2 hours
- **Data Range**: June 13, 2015 (DSCOVR launch) to present
- **Image Types**: 
  - Natural Color: True color images
  - Enhanced Color: False color with enhanced atmospheric features

## Notes

- All endpoints use the existing NASA_API_KEY from environment configuration
- Images are captured approximately every 2 hours
- Natural and enhanced color images may have different available dates
- Download URLs are pre-generated with the API key included
- Both PNG (full resolution) and JPG (thumbnail) formats are available
- All dates are returned in YYYY-MM-DD format
- Date validation ensures proper YYYY-MM-DD format
- Comprehensive error handling for all edge cases

## Integration Complete ✅

The NASA EPIC integration is fully functional and ready for testing via Swagger UI or manual curl commands.
