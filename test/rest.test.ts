import { describe, expect, it } from 'vitest';
import { durationSeconds, GoogleMapsRestService } from '../src/index.js';

/** A `fetch` that answers each call with the next of `bodies` and records what it was asked. */
function fakeFetch(...bodies: { status?: number; body: unknown }[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const { status = 200, body } = bodies.shift()!;
    return new Response(JSON.stringify(body), { status });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

describe('GoogleMapsRestService', () => {
  it('posts a request with the key and the field mask in headers', async () => {
    const { fetch, calls } = fakeFetch({ body: { places: [{ id: 'place-1' }] } });
    const service = new GoogleMapsRestService({
      key: 'secret',
      method: 'searchText',
      fieldMask: ['places.id'],
      fetch,
    });

    const result = await service.find({ query: { textQuery: 'Lindenweg 4, Freiburg' } });

    expect(result).toEqual({ places: [{ id: 'place-1' }] });
    expect(calls[0].url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(calls[0].init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ textQuery: 'Lindenweg 4, Freiburg' }),
      headers: { 'X-Goog-Api-Key': 'secret', 'X-Goog-FieldMask': 'places.id' },
    });
  });

  it('gets a place by its id, the rest of the request in the URL', async () => {
    const { fetch, calls } = fakeFetch({ body: { id: 'place/1' } });
    const service = new GoogleMapsRestService({
      key: 'secret',
      method: 'placeDetails',
      fieldMask: ['id', 'location'],
      fetch,
    });

    await service.find({ query: { placeId: 'place/1', languageCode: 'de' } });

    expect(calls[0].url).toBe('https://places.googleapis.com/v1/places/place%2F1?languageCode=de');
    expect(calls[0].init).toMatchObject({ method: 'GET', body: undefined });
  });

  it("flattens a weather request's location as Google takes it", async () => {
    const { fetch, calls } = fakeFetch({ body: { temperature: { degrees: 12 } } });
    const service = new GoogleMapsRestService({ key: 'secret', method: 'currentConditions', fetch });

    await service.find({ query: { location: { latitude: 47.99, longitude: 7.84 } } });

    expect(calls[0].url).toBe(
      'https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=47.99&location.longitude=7.84',
    );
    expect(calls[0].init.headers).not.toHaveProperty('X-Goog-FieldMask');
  });

  it('asks for all days in one page, and joins the pages of hours', async () => {
    const days = fakeFetch({ body: { forecastDays: [{}, {}, {}] } });
    await new GoogleMapsRestService({
      key: 'secret',
      method: 'forecastDays',
      fetch: days.fetch,
    }).find({ query: { location: { latitude: 1, longitude: 2 }, days: 3 } });
    expect(days.calls[0].url).toContain('days=3&pageSize=3');

    const hours = fakeFetch(
      { body: { forecastHours: [{ isDaytime: true }], nextPageToken: 'next' } },
      { body: { forecastHours: [{ isDaytime: false }], timeZone: { id: 'Europe/Berlin' } } },
    );
    const result = await new GoogleMapsRestService({
      key: 'secret',
      method: 'forecastHours',
      fetch: hours.fetch,
    }).find({ query: { location: { latitude: 1, longitude: 2 }, hours: 48 } });

    expect(result).toEqual({
      forecastHours: [{ isDaytime: true }, { isDaytime: false }],
      timeZone: { id: 'Europe/Berlin' },
    });
    expect(hours.calls[1].url).toContain('pageToken=next');
  });

  it("throws Google's error as the Feathers error of its status", async () => {
    const { fetch } = fakeFetch({
      status: 404,
      body: { error: { code: 404, message: 'Place not found.', status: 'NOT_FOUND' } },
    });
    const service = new GoogleMapsRestService({
      key: 'secret',
      method: 'placeDetails',
      fieldMask: ['id'],
      fetch,
    });

    await expect(service.find({ query: { placeId: 'nowhere' } })).rejects.toMatchObject({
      name: 'NotFound',
      message: 'Place not found.',
      data: { status: 'NOT_FOUND' },
    });
  });

  it('needs a key to call Google', async () => {
    const service = new GoogleMapsRestService({ key: '', method: 'currentConditions' });

    await expect(
      service.find({ query: { location: { latitude: 1, longitude: 2 } } }),
    ).rejects.toMatchObject({ name: 'GeneralError' });
  });
});

describe('durationSeconds', () => {
  it("reads the Routes API's durations", () => {
    expect(durationSeconds('1234s')).toBe(1234);
    expect(durationSeconds('0.5s')).toBe(0.5);
    expect(durationSeconds(undefined)).toBeNull();
  });
});
