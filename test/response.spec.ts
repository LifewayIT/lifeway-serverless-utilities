import { response } from '../lib';

test('response', async () => {
  const res = response(200, { jordan: 'isapoop' });
  expect(res.statusCode).toEqual(200);
});
