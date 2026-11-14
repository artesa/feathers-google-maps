import { BadRequest, errors, GeneralError } from '@feathersjs/errors';
import type {
  ComputeRoutesRequest,
  ComputeRoutesResponse,
  CurrentConditionsResponse,
  ForecastDaysRequest,
  ForecastDaysResponse,
  ForecastHoursRequest,
  ForecastHoursResponse,
  Place,
  PlaceDetailsRequest,
  SearchTextRequest,
  SearchTextResponse,
  WeatherRequest,
} from './types.js';

type Endpoint = {
  http: 'GET' | 'POST';
  url: string;
  /** Places and Routes return only the fields asked for, and bill by them. */
  fieldMask: boolean;
  /** The list a forecast comes in pages of. */
  pages?: 'forecastDays' | 'forecastHours';
};

export type GoogleMapsRestMethod =
  | 'searchText'
  | 'placeDetails'
  | 'computeRoutes'
  | 'currentConditions'
  | 'forecastDays'
  | 'forecastHours';

/** The methods that bill by the fields asked for. */
type FieldMaskMethod = 'searchText' | 'placeDetails' | 'computeRoutes';

const endpoints: Record<GoogleMapsRestMethod, Endpoint> = {
  searchText: {
    http: 'POST',
    url: 'https://places.googleapis.com/v1/places:searchText',
    fieldMask: true,
  },
  placeDetails: {
    http: 'GET',
    url: 'https://places.googleapis.com/v1/places/{placeId}',
    fieldMask: true,
  },
  computeRoutes: {
    http: 'POST',
    url: 'https://routes.googleapis.com/directions/v2:computeRoutes',
    fieldMask: true,
  },
  currentConditions: {
    http: 'GET',
    url: 'https://weather.googleapis.com/v1/currentConditions:lookup',
    fieldMask: false,
  },
  forecastDays: {
    http: 'GET',
    url: 'https://weather.googleapis.com/v1/forecast/days:lookup',
    fieldMask: false,
    pages: 'forecastDays',
  },
  forecastHours: {
    http: 'GET',
    url: 'https://weather.googleapis.com/v1/forecast/hours:lookup',
    fieldMask: false,
    pages: 'forecastHours',
  },
};

export interface GoogleMapsRestRequests {
  searchText: SearchTextRequest;
  placeDetails: PlaceDetailsRequest;
  computeRoutes: ComputeRoutesRequest;
  currentConditions: WeatherRequest;
  forecastDays: ForecastDaysRequest;
  forecastHours: ForecastHoursRequest;
}

export interface GoogleMapsRestResponses {
  searchText: SearchTextResponse;
  placeDetails: Place;
  computeRoutes: ComputeRoutesResponse;
  currentConditions: CurrentConditionsResponse;
  forecastDays: ForecastDaysResponse;
  forecastHours: ForecastHoursResponse;
}

export type GoogleMapsRestServiceOptions<M extends GoogleMapsRestMethod> = {
  key: string;
  method: M;
  /** Another `fetch`, e.g. for tests. */
  fetch?: typeof fetch;
} & (M extends FieldMaskMethod
  ? {
      /**
       * The fields to return, e.g. `['places.id']`. They decide the SKU a call is billed as, so
       * there is no default and no `*`.
       */
      fieldMask: readonly string[];
    }
  : { fieldMask?: undefined });

type Query = Record<string, unknown>;

/** `{ location: { latitude: 1 } }` as Google takes it in a URL: `location.latitude=1`. */
function searchParams(query: Query, prefix = '', params = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      searchParams(value as Query, `${prefix}${key}.`, params);
    } else {
      params.append(`${prefix}${key}`, String(value));
    }
  }
  return params;
}

/** Google's `{ error: { code, message, status } }` as the Feathers error of its HTTP status. */
function toFeathersError(status: number, body: unknown): Error {
  const error = (body as { error?: { message?: string } } | undefined)?.error;
  const ErrorClass = (errors as Record<number, typeof GeneralError | undefined>)[status];
  return new (ErrorClass ?? GeneralError)(error?.message ?? `Google answered ${status}`, error);
}

/** A duration of the Routes API, `"1234s"`, in seconds. */
export function durationSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const seconds = Number.parseFloat(duration);
  return Number.isFinite(seconds) ? seconds : null;
}

/**
 * One method of Google's REST APIs (Places API (New), Routes API, Weather API) as a Feathers
 * service: `find({ query })` and `create(data)` both call it with the request.
 */
export class GoogleMapsRestService<M extends GoogleMapsRestMethod> {
  readonly options: GoogleMapsRestServiceOptions<M>;

  constructor(options: GoogleMapsRestServiceOptions<M>) {
    this.options = options;
  }

  async find(params?: {
    query?: GoogleMapsRestRequests[M];
  }): Promise<GoogleMapsRestResponses[M]> {
    if (!params?.query) throw new BadRequest('Missing query parameters');
    return this.request(params.query);
  }

  async create(data: GoogleMapsRestRequests[M]): Promise<GoogleMapsRestResponses[M]> {
    return this.request(data);
  }

  /** A forecast longer than a page comes in pages, each a billed call: followed and joined. */
  private async request(input: GoogleMapsRestRequests[M]): Promise<GoogleMapsRestResponses[M]> {
    const { pages } = endpoints[this.options.method];
    let query = input as Query;
    // a page holds at most 10 days: all of them in one call
    if (pages === 'forecastDays' && query.pageSize === undefined) {
      query = { ...query, pageSize: Math.min(Number(query.days ?? 10), 10) };
    }
    let response = await this.call(query);
    if (!pages || query.pageToken) return response as GoogleMapsRestResponses[M];

    while (response.nextPageToken) {
      const next = await this.call({ ...query, pageToken: response.nextPageToken });
      response = {
        ...next,
        [pages]: [...((response[pages] as unknown[]) ?? []), ...((next[pages] as unknown[]) ?? [])],
      };
    }
    return response as GoogleMapsRestResponses[M];
  }

  private async call(input: Query): Promise<Query> {
    const { key, method, fieldMask, fetch: fetchFn = fetch } = this.options;
    if (!key) {
      throw new GeneralError(
        'You must use an API key to authenticate each request to Google Maps Platform APIs.',
      );
    }
    const endpoint = endpoints[method];
    const { placeId, ...rest } = input;
    let url = endpoint.url.replace('{placeId}', encodeURIComponent(String(placeId ?? '')));

    const headers: Record<string, string> = { 'X-Goog-Api-Key': key };
    if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask.join(',');
    let body: string | undefined;
    if (endpoint.http === 'GET') {
      const params = searchParams(endpoint.url.includes('{placeId}') ? rest : input);
      if (params.size) url += `?${params}`;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(input);
    }

    const response = await fetchFn(url, { method: endpoint.http, headers, body });
    const json = (await response.json().catch(() => ({}))) as Query;
    if (!response.ok) throw toFeathersError(response.status, json);
    return json;
  }
}
