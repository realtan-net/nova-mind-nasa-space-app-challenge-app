# Quick Start Guide - Asteroid NeoWs API

## Endpoint
```
GET /api/asteroids/feed
```

## Quick Test Commands

### Basic Usage (2-day range)
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07&end_date=2025-09-08"
```

### Using Default 7-day Range
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07"
```

### View Summary Only
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07&end_date=2025-09-08" | jq '.data.summary'
```

### Count Asteroids by Date
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07" | jq '.data.asteroidsByDate | to_entries | .[] | {date: .key, count: (.value | length)}'
```

### View Closest Approach
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07&end_date=2025-09-08" | jq '.data.summary.closestApproach'
```

### View Potentially Hazardous Asteroids
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07" | jq '[.data.asteroidsByDate[][] | select(.isPotentiallyHazardous == true) | {name: .name, date: .closeApproachData.date, distance_km: .closeApproachData.missDistance.kilometers}]'
```

## Parameters

| Parameter | Required | Format | Default | Max Range |
|-----------|----------|--------|---------|-----------|
| start_date | Yes | YYYY-MM-DD | - | - |
| end_date | No | YYYY-MM-DD | start_date + 7 days | 7 days from start_date |

## Response Structure

```json
{
  "success": true,
  "data": {
    "source": "NASA NeoWs API",
    "dateRange": { "startDate": "...", "endDate": "..." },
    "elementCount": 31,
    "asteroidsByDate": { "2025-09-07": [...] },
    "summary": {
      "totalAsteroids": 31,
      "potentiallyHazardous": 2,
      "sentryObjects": 1,
      "closestApproach": {...},
      "largestAsteroid": {...},
      "fastestAsteroid": {...}
    },
    "pagination": {...}
  },
  "requestTimestamp": "2025-10-05T12:00:00Z",
  "processingTime": 456
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_DATE_FORMAT | 400 | Invalid or missing date parameter |
| DATE_RANGE_EXCEEDED | 400 | Date range larger than 7 days |
| NASA_NEOWS_UNAVAILABLE | 502 | NASA API temporarily unavailable |
| NASA_NEOWS_TIMEOUT | 504 | Request timed out |
| NASA_NEOWS_RATE_LIMIT | 429 | API rate limit exceeded |

## Swagger UI

Access interactive documentation:
```
http://localhost:3000/api-docs
```

Navigate to the **Asteroids** section to try out the endpoint directly in your browser.

## Example Use Cases

### 1. Monitor Near-Earth Objects for a Week
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07"
```

### 2. Check Specific Date Range
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07&end_date=2025-09-10"
```

### 3. Get Statistics Only
```bash
curl "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07" | jq '{total: .data.summary.totalAsteroids, hazardous: .data.summary.potentiallyHazardous, closest: .data.summary.closestApproach.name}'
```

### 4. Integration with Other Endpoints
```bash
# Combine with weather data for impact analysis
weather=$(curl -s "http://localhost:3000/api/weather/data?latitude=40.7&longitude=-74.0&date=2025-09-07")
asteroids=$(curl -s "http://localhost:3000/api/asteroids/feed?start_date=2025-09-07&end_date=2025-09-07")

echo "Weather: $weather"
echo "Asteroids: $asteroids"
```

## Tips

1. **Use jq for JSON parsing**: Install jq (`apt-get install jq` on Ubuntu) for easier JSON handling
2. **Date format**: Always use YYYY-MM-DD format
3. **Rate limits**: NASA API has rate limits - use responsibly
4. **Caching**: Consider caching responses for the same date range
5. **Pagination**: Use pagination links in response for large datasets

## Support

- Documentation: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/api/health
- All Endpoints: http://localhost:3000/api
