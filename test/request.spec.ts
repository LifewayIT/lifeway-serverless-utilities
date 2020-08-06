import { getOrigin, parseBody, getSub, getUserId } from '../lib';

test('event origin is returned from origin header', () => {
  const event: any = { headers: { origin: 'localhost' } };
  expect(getOrigin(event)).toEqual(event.headers.origin);
});

test('event origin is returned from Origin header', () => {
  const event: any = { headers: { Origin: 'localhost' } };
  expect(getOrigin(event)).toEqual(event.headers.Origin);
});

test('event body is parsed into JSON object', () => {
  const body = '{ "test": "Standby. This is a test." }';
  expect(parseBody({ body } as any)).toEqual(JSON.parse(body));
});

test('event body is decoded if it is base64 encoded', () => {
  const body = 'ewoJImdlbmRlciI6ICJNQUxFIiwKCSJpZCI6ICI1ODhGMkUzOS1GODY5LTQzQzAtOUMzOS05RDMzMDZFQTk4RjgiCn0=';
  const decodedBody = {
    'gender': 'MALE',
    'id': '588F2E39-F869-43C0-9C39-9D3306EA98F8'
  };
  expect(parseBody({ body, isBase64Encoded: true } as any)).toEqual(decodedBody);
});

test('getSub', () => {
  expect(getSub({ requestContext: {
    authorizer: {
      claims: {
        sub: 'id'
      }
    }
  }} as any)).toEqual('id');
});

test('getUserId', () => {
  expect(getUserId({ requestContext: {
    authorizer: {
      principalId: 'id'
    }
  }} as any)).toEqual('id');
});
