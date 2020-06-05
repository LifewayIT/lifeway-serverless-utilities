import { getOrigin, parseBody } from "../lib";

test('event origin is returned from origin header', () => {
  const event = { headers: { origin: 'localhost' } };
  expect(getOrigin(event)).toEqual(event.headers.origin);
});

test('event origin is returned from Origin header', () => {
  const event = { headers: { Origin: 'localhost' } };
  expect(getOrigin(event)).toEqual(event.headers.Origin);
});

test('event body is parsed into JSON object', () => {
  const body = '{ "test": "Standby. This is a test." }';
  expect(parseBody({ body })).toEqual(JSON.parse(body));
});

test('event body is decoded if it is base64 encoded', () => {
  const body = 'ewoJImdlbmRlciI6ICJNQUxFIiwKCSJpZCI6ICI1ODhGMkUzOS1GODY5LTQzQzAtOUMzOS05RDMzMDZFQTk4RjgiCn0=';
  const decodedBody = {
    'gender': 'MALE',
    'id': '588F2E39-F869-43C0-9C39-9D3306EA98F8'
  };
  expect(parseBody({ body, isBase64Encoded: true })).toEqual(decodedBody);
});
