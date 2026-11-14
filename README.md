# @artesa/feathers-google-maps

> Feathers services for Google Maps Platform: Places API (New), Routes API and Weather API

Each Google method is a Feathers service, so caching, rate limits and logging go into hooks.

## Installation

```
pnpm add @artesa/feathers-google-maps
```

Node 26.13 or later. Enable the APIs you use for your key in the Google Cloud console.

## Usage

```ts
import {
  GoogleMapsRestService,
  durationSeconds,
} from '@artesa/feathers-google-maps'

app.use(
  'places/search',
  new GoogleMapsRestService({
    key,
    method: 'searchText',
    fieldMask: ['places.id'],
  }),
)
app.use(
  'weather/days',
  new GoogleMapsRestService({ key, method: 'forecastDays' }),
)

const { places } = await app
  .service('places/search')
  .find({ query: { textQuery: 'Lindenweg 4, Freiburg' } })

const { forecastDays } = await app.service('weather/days').find({
  query: {
    location: { latitude: 47.99, longitude: 7.84 },
    days: 7,
    languageCode: 'de',
  },
})
```

`find({ query })` and `create(data)` both send the request; `find` suits Feathers' caching hooks.
Requests and responses are typed per method (`GoogleMapsRestRequests`, `GoogleMapsRestResponses`).

| `method`            | API              | Request                                      |
| ------------------- | ---------------- | -------------------------------------------- |
| `searchText`        | Places API (New) | `POST places:searchText`                     |
| `placeDetails`      | Places API (New) | `GET places/{placeId}`, `placeId` in `query` |
| `computeRoutes`     | Routes API       | `POST directions/v2:computeRoutes`           |
| `currentConditions` | Weather API      | `GET currentConditions:lookup`               |
| `forecastDays`      | Weather API      | `GET forecast/days:lookup`, up to 10 days    |
| `forecastHours`     | Weather API      | `GET forecast/hours:lookup`, up to 240 hours |

- **Field masks** are required for Places and Routes: the fields you ask for decide the SKU a call
  is billed as, so there is no default and no `*`.
- **Forecasts** that span several pages are fetched page by page and joined; each page is a billed
  call. All 10 days fit one page, which the service asks for unless you give a `pageSize`.
  Passing a `pageToken` yourself returns just that page.
- **Errors** are Google's message as the Feathers error of the HTTP status (`NotFound`,
  `BadRequest`, …), Google's `error` object as `data`.
- `durationSeconds('1234s')` reads the Routes API's durations.
- Weather shown to users needs Google's attribution next to it: see the Weather API's policies.

## Legacy web services

The 2.x wrapper of `@googlemaps/google-maps-services-js` (Directions, Distance Matrix, Find Place,
Place Details, Geocoding, …) moved to its own entry; install that library alongside:

```ts
import { GoogleMapsService } from '@artesa/feathers-google-maps/legacy'

app.use('directions', new GoogleMapsService({ key, method: 'directions' }))
```

## License

Copyright (c) 2026 Artesa

Licensed under the [MIT license](LICENSE).
