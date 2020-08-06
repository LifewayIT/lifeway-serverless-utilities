import { validateApiKey } from '../lib';
import { APIGatewayEvent } from 'aws-lambda';

test('api validation allows approved api key', async () => {
  const event = { headers: { 'x-api-key': 'API_KEY_1' }} as any as APIGatewayEvent;
  const apiKeys = ['API_KEY_1', 'API_KEY_2'];

  const res = await validateApiKey(apiKeys)({ event });
  expect(res).toEqual({ event });
});

test('api validation rejects  with 403 on unauthorized api key', async () => {
  const event = { headers: { 'x-api-key': 'API_KEY_FAIL' }} as any as APIGatewayEvent;
  const apiKeys = ['API_KEY_1', 'API_KEY_2'];

  const res = validateApiKey(apiKeys)({ event });
  await expect(res).rejects.toEqual(expect.objectContaining({ statusCode: 403 }));
});
