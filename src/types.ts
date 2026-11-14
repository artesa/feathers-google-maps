/*
 * Requests and responses of Google's REST APIs, as far as documented. Every response field is
 * optional: a field mask, the country or the data leaves fields out.
 */

export type LatLng = { latitude: number; longitude: number };

export type LocalizedText = { text?: string; languageCode?: string };

/** Google's `Interval`: RFC 3339 timestamps in UTC. */
export type Interval = { startTime?: string; endTime?: string };

// MARK: Places API (New)

export type SearchTextRequest = {
  textQuery: string;
  languageCode?: string;
  regionCode?: string;
  includedType?: string;
  strictTypeFiltering?: boolean;
  pageSize?: number;
  pageToken?: string;
  locationBias?:
    | { circle: { center: LatLng; radius: number } }
    | { rectangle: { low: LatLng; high: LatLng } };
  locationRestriction?: { rectangle: { low: LatLng; high: LatLng } };
};

export type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
  languageCode?: string;
};

export type Place = {
  id?: string;
  /** `places/{id}` */
  name?: string;
  displayName?: LocalizedText;
  types?: string[];
  primaryType?: string;
  formattedAddress?: string;
  shortFormattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: LatLng;
  viewport?: { low?: LatLng; high?: LatLng };
  googleMapsUri?: string;
  utcOffsetMinutes?: number;
};

export type SearchTextResponse = { places?: Place[]; nextPageToken?: string };

export type PlaceDetailsRequest = {
  placeId: string;
  languageCode?: string;
  regionCode?: string;
  sessionToken?: string;
};

// MARK: Routes API

export type Waypoint = {
  location?: { latLng: LatLng; heading?: number };
  placeId?: string;
  address?: string;
  via?: boolean;
  vehicleStopover?: boolean;
  sideOfRoad?: boolean;
};

export type ComputeRoutesRequest = {
  origin: Waypoint;
  destination: Waypoint;
  intermediates?: Waypoint[];
  travelMode?: 'DRIVE' | 'BICYCLE' | 'WALK' | 'TWO_WHEELER' | 'TRANSIT';
  /** `TRAFFIC_AWARE` and `TRAFFIC_AWARE_OPTIMAL` bill a higher SKU. */
  routingPreference?: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  departureTime?: string;
  arrivalTime?: string;
  computeAlternativeRoutes?: boolean;
  routeModifiers?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
    avoidIndoor?: boolean;
  };
  languageCode?: string;
  regionCode?: string;
  units?: 'METRIC' | 'IMPERIAL';
};

export type RouteLeg = {
  distanceMeters?: number;
  /** Seconds with an `s`, e.g. `"1234s"`: see `durationSeconds`. */
  duration?: string;
  staticDuration?: string;
  startLocation?: { latLng?: LatLng };
  endLocation?: { latLng?: LatLng };
};

export type Route = {
  distanceMeters?: number;
  /** Seconds with an `s`, e.g. `"1234s"`: see `durationSeconds`. */
  duration?: string;
  staticDuration?: string;
  legs?: RouteLeg[];
  polyline?: { encodedPolyline?: string };
  description?: string;
  localizedValues?: {
    distance?: LocalizedText;
    duration?: LocalizedText;
    staticDuration?: LocalizedText;
  };
};

export type GeocodedWaypoint = {
  geocoderStatus?: { code?: number; message?: string };
  type?: string[];
  partialMatch?: boolean;
  placeId?: string;
};

/** Without a route, e.g. across an ocean, `routes` is missing. */
export type ComputeRoutesResponse = {
  routes?: Route[];
  geocodingResults?: {
    origin?: GeocodedWaypoint;
    destination?: GeocodedWaypoint;
    intermediates?: GeocodedWaypoint[];
  };
};

// MARK: Weather API

export type WeatherRequest = {
  location: LatLng;
  /** Default `METRIC`. */
  unitsSystem?: 'METRIC' | 'IMPERIAL';
  /** BCP-47, default `en`: the language of `weatherCondition.description`. */
  languageCode?: string;
};

/** Up to 10 days from today. */
export type ForecastDaysRequest = WeatherRequest & {
  days?: number;
  pageSize?: number;
  pageToken?: string;
};

/** Up to 240 hours from the current one. */
export type ForecastHoursRequest = WeatherRequest & {
  hours?: number;
  pageSize?: number;
  pageToken?: string;
};

export type Temperature = { degrees?: number; unit?: 'CELSIUS' | 'FAHRENHEIT' };

export type WeatherCondition = {
  /** Without an extension: append `.svg` or `.png`, `_dark` before it for dark mode. */
  iconBaseUri?: string;
  description?: LocalizedText;
  /** E.g. `CLEAR`, `PARTLY_CLOUDY`, `LIGHT_RAIN`; Google may add new ones. */
  type?: string;
};

export type Precipitation = {
  probability?: { percent?: number; type?: string };
  qpf?: { quantity?: number; unit?: string };
  snowQpf?: { quantity?: number; unit?: string };
};

export type Wind = {
  direction?: { degrees?: number; cardinal?: string };
  speed?: { value?: number; unit?: string };
  gust?: { value?: number; unit?: string };
};

export type CurrentConditionsResponse = {
  currentTime?: string;
  timeZone?: { id?: string };
  isDaytime?: boolean;
  weatherCondition?: WeatherCondition;
  temperature?: Temperature;
  feelsLikeTemperature?: Temperature;
  dewPoint?: Temperature;
  heatIndex?: Temperature;
  windChill?: Temperature;
  relativeHumidity?: number;
  uvIndex?: number;
  precipitation?: Precipitation;
  thunderstormProbability?: number;
  airPressure?: { meanSeaLevelMillibars?: number };
  wind?: Wind;
  visibility?: { distance?: number; unit?: string };
  cloudCover?: number;
  currentConditionsHistory?: {
    temperatureChange?: Temperature;
    maxTemperature?: Temperature;
    minTemperature?: Temperature;
    qpf?: { quantity?: number; unit?: string };
    snowQpf?: { quantity?: number; unit?: string };
  };
};

/** Daytime is 7am to 7pm local, nighttime the rest. */
export type ForecastDayPart = {
  interval?: Interval;
  weatherCondition?: WeatherCondition;
  relativeHumidity?: number;
  uvIndex?: number;
  precipitation?: Precipitation;
  thunderstormProbability?: number;
  wind?: Wind;
  cloudCover?: number;
};

export type ForecastDay = {
  interval?: Interval;
  displayDate?: { year: number; month: number; day: number };
  daytimeForecast?: ForecastDayPart;
  nighttimeForecast?: ForecastDayPart;
  /** Only in Japan and Korea, which have no day parts. */
  fullDayForecast?: ForecastDayPart;
  maxTemperature?: Temperature;
  minTemperature?: Temperature;
  feelsLikeMaxTemperature?: Temperature;
  feelsLikeMinTemperature?: Temperature;
  sunEvents?: { sunriseTime?: string; sunsetTime?: string };
};

export type ForecastDaysResponse = {
  forecastDays?: ForecastDay[];
  timeZone?: { id?: string };
  nextPageToken?: string;
};

export type ForecastHour = {
  interval?: Interval;
  displayDateTime?: {
    year: number;
    month: number;
    day: number;
    hours?: number;
    minutes?: number;
    utcOffset?: string;
  };
  isDaytime?: boolean;
  weatherCondition?: WeatherCondition;
  temperature?: Temperature;
  feelsLikeTemperature?: Temperature;
  precipitation?: Precipitation;
  wind?: Wind;
  relativeHumidity?: number;
  uvIndex?: number;
  thunderstormProbability?: number;
  cloudCover?: number;
};

export type ForecastHoursResponse = {
  forecastHours?: ForecastHour[];
  timeZone?: { id?: string };
  nextPageToken?: string;
};
