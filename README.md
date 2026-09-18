# Weather-and-Currency-Dashboard-2.0

Live weather (Open-Meteo) + currency conversion (Frankfurter). Zero build step, zero API keys.

[Live Demo](https://<your-username>.github.io/weather-currency-dashboard/)

## Features
- Geolocation-aware weather with 7-day forecast and hourly temperature chart
- City search via geocoding API
- Reverse geocoding for accurate location names
- 18 currencies with live ECB rates, cached in `localStorage` for 1 hour
- 30-day sparkline of the selected currency pair
- Responsive dark theme, no frameworks
- Auto-deploy via GitHub Actions to Pages

## Tech
- Vanilla HTML / CSS / JS
- Open-Meteo (weather & geocoding)
- Frankfurter (currency)
- BigDataCloud (reverse geocoding)
- Chart.js (charts)

## Run locally
```bash
git clone https://github.com/<you>/weather-currency-dashboard
cd weather-currency-dashboard
python3 -m http.server 8000
