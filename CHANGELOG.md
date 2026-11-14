# Changelog

## 3.0.0

- `GoogleMapsRestService`: Places API (New) (`searchText`, `placeDetails`), Routes API
  (`computeRoutes`) and Weather API (`currentConditions`, `forecastDays`, `forecastHours`) as
  Feathers services, typed per method, with a required field mask where Google bills by fields.
- Forecasts are fetched across pages and joined; `durationSeconds` reads Routes durations.
- **Breaking:** the legacy `GoogleMapsService` moved to `@artesa/feathers-google-maps/legacy`, and
  `@googlemaps/google-maps-services-js` is an optional peer dependency, needed for it only.
