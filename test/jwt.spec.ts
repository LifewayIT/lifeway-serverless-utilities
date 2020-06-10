import { decode } from 'jsonwebtoken';
import { APIGatewayEvent } from 'aws-lambda';
import { getDecodedJwt, validateScope } from '../lib';

jest.mock('jsonwebtoken');

beforeEach(() => {
  jest.resetAllMocks();
});

const event = { headers: { authorization: 'Bearer something' }} as any as APIGatewayEvent
test('decode', async () => {
  (decode as jest.Mock).mockReturnValue({ foo: 'bar' });
  getDecodedJwt(event);
  expect(decode).toHaveBeenCalledWith('something', { complete: true });
});

test('scope validation', async () => {
  (decode as jest.Mock).mockReturnValue({ payload: {
    scope: ['scope', 'scope2']
  }});
  const res = await validateScope('scope')({ event });
  expect(decode).toHaveBeenCalledWith('something', { complete: true });
  expect(res).toEqual({ event });
});

test('scope validation support space delimited string', async () => {
  (decode as jest.Mock).mockReturnValue({ payload: {
    scope: 'scope scope2'
  }});
  const res = await validateScope('scope')({ event });
  expect(decode).toHaveBeenCalledWith('something', { complete: true });
  expect(res).toEqual({ event });
});

test('scope validation rejects with 403 on error', async () => {
  (decode as jest.Mock).mockReturnValue({ payload: {
    scope: ['scope']
  }});
  const res = validateScope('jordanisapoop')({ event });
  expect(decode).toHaveBeenCalledWith('something', { complete: true });
  await expect(res).rejects.toEqual(expect.objectContaining({ statusCode: 403 }));
});
