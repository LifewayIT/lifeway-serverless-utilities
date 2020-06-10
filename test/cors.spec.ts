import { addCorsHeaders, isAllowedOrigin } from '../lib/cors';
import { internet } from 'faker';

test('origin is allowed if included in ALLOWED_ORIGINS environment variable', () => {
  const origin = internet.domainName();
  process.env.ALLOWED_ORIGINS = `${origin},${internet.domainName()}`;
  expect(isAllowedOrigin(origin)).toEqual(true);
});

test('origin is not allowed if not included in ALLOWED_ORIGINS environment variable', () => {
  const origin = internet.domainName();
  process.env.ALLOWED_ORIGINS = `${internet.domainName()}`;
  expect(isAllowedOrigin(origin)).toEqual(false);
});

test('when ALLOWED_ORIGINS is not set, then defaulted to localhost', () => {
  delete process.env.ALLOWED_ORIGINS;
  expect(isAllowedOrigin('localhost')).toEqual(true);
});

test('include wildcard headers if origin is not allowed', () => {
  const event = { headers: { origin: internet.domainName() } } as any;
  process.env.ALLOWED_ORIGINS = internet.domainName();
  expect(addCorsHeaders(event)({} as any)).toEqual({
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': false
    }
  });
});

test('include restricted headers if origin is allowed', () => {
  const event = { headers: { origin: internet.domainName() } } as any;
  process.env.ALLOWED_ORIGINS = event.headers.origin;
  expect(addCorsHeaders(event)({} as any)).toEqual({
    headers: {
      'Access-Control-Allow-Origin': event.headers.origin,
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      'Access-Control-Request-Headers': 'X-PINGOTHER, Content-Type',
      'Access-Control-Allow-Headers': 'Origin, origin, DNT, X-Mx-ReqToken, Keep-Alive, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Authorization, Cookie, Set-Cookie',
    }
  });
});