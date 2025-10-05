# NASA EONET API - Quick Start Guide 🌍

## What is NASA EONET?

NASA's Earth Observatory Natural Event Tracker (EONET) provides real-time data about natural disaster events happening around the world, including wildfires, severe storms, earthquakes, floods, and more.

## Quick Start

### 1. Start the Server

```bash
npm start
```

Server will start on `http://localhost:3000`

### 2. Access Swagger Documentation

Open in browser:
```
http://localhost:3000/api-docs
```

Look for the **"Natural Events"** section in Swagger UI.

## API Endpoints

### 1. Get All Event Categories

**Endpoint**: `GET /api/eonet/categories`

**Example**:
```bash
curl http://localhost:3000/api/eonet/categories
```

**Returns**: 13 event categories (wildfires, severeStorms, earthquakes, etc.)

---

### 2. Get Current Open Events

**Endpoint**: `GET /api/eonet/events`

**Parameters**:
- `status` (optional): "open" or "closed" (default: "open")
- `limit` (optional): Number of events (default: 20, max: 100)

**Example**:
```bash
curl "http://localhost:3000/api/eonet/events?status=open&limit=5"
```

**Use Case**: Dashboard showing "Current Natural Events"

---

### 3. Get Wildfires

**Endpoint**: `GET /api/eonet/events/category/wildfires`

**Parameters**:
- `status` (optional): "open" or "closed"
- `limit` (optional): Number of events

**Example**:
```bash
curl "http://localhost:3000/api/eonet/events/category/wildfires?status=open&limit=10"
```

**Returns**: Active wildfires with size in acres, last update time, stale data warnings

**Use Case**: Environmental alert module for air quality monitoring

---

### 4. Get Regional Events (with Proximity)

**Endpoint**: `GET /api/eonet/events/regional`

**Parameters**:
- `bbox` (required): Bounding box "minLon,minLat,maxLon,maxLat"
- `userLat` (optional): Your latitude for distance calculation
- `userLon` (optional): Your longitude for distance calculation
- `status` (optional): "open" or "closed"
- `limit` (optional): Number of events

**Example**:
```bash
curl "http://localhost:3000/api/eonet/events/regional?bbox=26.5,38.0,28.0,39.0&userLat=38.5&userLon=27.0"
```

**Returns**: Events in the region with:
- Distance to your location (km and miles)
- Risk level: HIGH (<50km), MEDIUM (50-150km), LOW (>150km)
- Alert messages

**Use Case**: Local risk awareness - "Is there a wildfire near me?"

---

### 5. Get Storm Trend Analysis

**Endpoint**: `GET /api/eonet/events/analysis`

**Parameters**:
- `category` (required): e.g., "severeStorms"
- `start` (required): Start date (YYYY-MM-DD)
- `end` (required): End date (YYYY-MM-DD)
- `limit` (optional): Number of events

**Example**:
```bash
curl "http://localhost:3000/api/eonet/events/analysis?category=severeStorms&start=2025-09-28&end=2025-10-04&limit=5"
```

**Returns**: Storm evolution with:
- Timeline of magnitude changes
- Trend: "strengthening" / "weakening" / "stable"
- Percentage change
- Timeline arrows showing increases/decreases

**Use Case**: Track tropical storm intensity changes

---

### 6. Get Events in GeoJSON Format

**Endpoint**: `GET /api/eonet/events/geojson`

**Parameters**:
- `status` (optional): "open" or "closed"
- `category` (optional): Filter by category
- `limit` (optional): Number of events

**Example**:
```bash
curl "http://localhost:3000/api/eonet/events/geojson?status=open&category=wildfires"
```

**Returns**: GeoJSON FeatureCollection ready for map libraries (Leaflet, Google Maps)

**Use Case**: Direct integration with mapping libraries

---

## Available Categories

| Category ID | Description |
|-------------|-------------|
| `drought` | Drought events |
| `dustHaze` | Dust storms and air pollution |
| `earthquakes` | Earthquakes |
| `floods` | Flooding events |
| `landslides` | Landslides and mudslides |
| `manmade` | Human-induced extreme events |
| `seaLakeIce` | Sea and lake ice events |
| `severeStorms` | Hurricanes, cyclones, typhoons |
| `snow` | Extreme snowfall events |
| `tempExtremes` | Heat waves and cold snaps |
| `volcanoes` | Volcanic eruptions |
| `waterColor` | Algae blooms, red tide, etc. |
| `wildfires` | Forest and wildland fires |

---

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": {
    "source": "NASA EONET API",
    "totalEvents": 10,
    "events": [...],
    "summary": {...}
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 234
}
```

---

## Real-World Examples

### Example 1: Check for Nearby Wildfires

You're in Istanbul, Turkey (lat: 41.0, lon: 29.0):

```bash
curl "http://localhost:3000/api/eonet/events/regional?bbox=28.0,40.0,30.0,42.0&userLat=41.0&userLon=29.0&limit=10"
```

Response tells you:
- How many events in your region
- Distance to each event
- Risk level (HIGH/MEDIUM/LOW)
- Alert message

### Example 2: Track Hurricane Development

Check if any tropical storms are strengthening in the past week:

```bash
curl "http://localhost:3000/api/eonet/events/analysis?category=severeStorms&start=2025-09-28&end=2025-10-05"
```

Response shows:
- Storm evolution timeline
- Wind speed changes
- Trend analysis (strengthening/weakening)
- Percentage increase

### Example 3: Dashboard Widget

Get 5 most recent major events for a dashboard:

```bash
curl "http://localhost:3000/api/eonet/events?status=open&limit=5"
```

Display each with:
- Category icon
- Title
- Current magnitude (e.g., "75 kts" for storms, "512 acres" for fires)
- Last update time

---

## Special Features

### 1. Proximity Analysis
- Haversine formula for accurate distance calculation
- Automatic risk level classification
- Distance in both kilometers and miles

### 2. Trend Analysis
- Tracks magnitude changes over time
- Calculates percentage increase/decrease
- Identifies strengthening/weakening patterns
- Timeline with arrows (↑↓→)

### 3. Data Freshness Indicators
- Detects stale data (>48 hours old)
- Shows data age in hours
- Warns about outdated information

### 4. Statistics and Summaries
- Events grouped by category
- Average magnitudes calculated
- Risk level distribution
- Nearest event identification

---

## Tips for Frontend Integration

### For Map Display
Use the GeoJSON endpoint:
```javascript
fetch('/api/eonet/events/geojson?status=open')
  .then(res => res.json())
  .then(data => {
    // data.data is GeoJSON FeatureCollection
    L.geoJSON(data.data).addTo(map);
  });
```

### For Local Alerts
Get user's coordinates and check nearby events:
```javascript
navigator.geolocation.getCurrentPosition(pos => {
  const { latitude, longitude } = pos.coords;
  const bbox = calculateBbox(latitude, longitude, 100); // 100km radius
  
  fetch(`/api/eonet/events/regional?bbox=${bbox}&userLat=${latitude}&userLon=${longitude}`)
    .then(res => res.json())
    .then(data => {
      const highRiskEvents = data.data.events.filter(
        e => e.proximityToUser?.riskLevel === 'HIGH'
      );
      if (highRiskEvents.length > 0) {
        showAlert('High risk event nearby!');
      }
    });
});
```

### For Storm Tracking
Update storm intensity every hour:
```javascript
setInterval(() => {
  const lastWeek = getDateRange(7);
  fetch(`/api/eonet/events/analysis?category=severeStorms&start=${lastWeek.start}&end=${lastWeek.end}`)
    .then(res => res.json())
    .then(data => {
      data.data.events.forEach(storm => {
        updateStormWidget(storm.id, {
          trend: storm.trendAnalysis.trend,
          currentMagnitude: storm.currentMagnitude.label
        });
      });
    });
}, 3600000); // Every hour
```

---

## Testing via Swagger

1. Open `http://localhost:3000/api-docs`
2. Scroll to **"Natural Events"** section
3. Click "Try it out" on any endpoint
4. Fill in parameters
5. Click "Execute"
6. See the response

---

## No API Key Required

NASA EONET API is completely public and doesn't require authentication. No configuration needed!

---

## Error Handling

If you get an error, check the response:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CATEGORY",
    "message": "Invalid category ID provided",
    "details": {
      "provided": "invalidCategory",
      "validCategories": ["wildfires", "severeStorms", ...]
    }
  }
}
```

Common error codes:
- `INVALID_CATEGORY` - Wrong category ID
- `INVALID_BBOX_FORMAT` - Bbox format error
- `INVALID_DATE_RANGE` - End date before start date
- `LIMIT_EXCEEDED` - Limit > 100
- `NASA_EONET_UNAVAILABLE` - API temporarily down

---

## Live Data

NASA EONET provides real-time data that's updated regularly:
- Events remain "open" until NASA marks them as closed
- Geometry tracks event movement (e.g., hurricane path)
- Magnitude values show event intensity changes

---

## Questions?

Check the full documentation:
- `EONET_IMPLEMENTATION_COMPLETE.md` - Complete technical documentation
- Swagger UI at `/api-docs` - Interactive API documentation
- NASA EONET docs: https://eonet.gsfc.nasa.gov/docs/v3

---

**Ready to track natural disasters! 🌍🔥🌊⚡**
