# Open-Meteo Wrapper

A lightweight, self-hosted Bun wrapper around the [Open-Meteo](https://open-meteo.com/) API. Deploy your own instance to avoid running into public API rate limits.

## Requirements

- [Bun](https://bun.sh/) runtime

## Running

```bash
bun run start
```

The server starts on `http://localhost:3000`.

## API

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `city`    | Yes      | City name. For specificity, include the country, e.g. `Katowice,Poland`. |
| `date`    | No       | Either an ISO date (`2026-04-27`) or a number of days in the future (`1`-`14`). Open-Meteo provides forecasts for up to 16 days but from tests some future data may still be missing. |
| `hour`    | No       | Hour in 24-hour format (`0`-`23`). When omitted, the response includes the daily min/max temperatures alongside the average. |
| `debug`   | No       | Set to any value to receive the raw upstream JSON instead of the formatted text output. |

### Examples

#### Current weather (no date/hour)
```bash
curl "http://localhost:3000/?city=Berlin"
```
**Response:**
```
overcast, 🌡️10.9°C (min: 4.9°C max: 16.2°C) feels like: 7.6°C (min: 1.8°C max: 13.5°C), 🌧️0% 0mm, 💨↑14km/h, 1018.2hPa
```

#### Forecast for tomorrow
```bash
curl "http://localhost:3000/?city=Katowice,Poland&date=1"
```
**Response:**
```
overcast, 🌡️10.7°C (min: 7.1°C max: 13.7°C) feels like: 6.7°C (min: 2.5°C max: 10.5°C), 🌧️0% 0mm, 💨↗15.5km/h, 991.2hPa
```

#### Specific hour today
```bash
curl "http://localhost:3000/?city=Berlin&hour=13"
```
**Response:**
```
overcast, 🌡️15.5°C feels like: 13.3°C, 🌧️0% 0mm, 💨←10km/h, 1017.6hPa
```

#### Specific date and hour
```bash
curl "http://localhost:3000/?city=Berlin&date=2026-04-27&hour=7"
```
**Response:**
```
clear sky, 🌡️5.1°C feels like: 1.9°C, 🌧️0% 0mm, 💨↘4.2km/h, 1019.1hPa
```

#### Debug mode (raw JSON)
```bash
curl "http://localhost:3000/?city=Berlin&debug=1"
```

## Response Format

- **Success** - `200 OK` with a plain-text human-readable weather summary.
- **Errors** - JSON object `{ "error": true, "message": "..." }` with an appropriate HTTP status code.

### Error Codes

| Status | Cause |
|--------|-------|
| `400`  | Missing required `city` query parameter. |
| `400`  | Invalid `date` format or invalid `hour` format. |
| `404`  | Location not found. |
| `502`  | Upstream Open-Meteo API returned an error (e.g., forecast range exceeded). |

## Why this project was made

This wrapper was originally built for AI workloads that needed date-specific weather lookups (e.g. "what will the weather be in Berlin next Tuesday at 2 PM?"). Full `wttr.in` reports are verbose, and using Open-Meteo directly forces you to list every requested weather variable in a long URL, then parse a detailed JSON response back. Both approaches burn a lot of tokens inside an LLM prompt. This app condenses all of that into a compact, plain-text summary that's easy for models to read and cheap to include in prompts.

## License

MIT
