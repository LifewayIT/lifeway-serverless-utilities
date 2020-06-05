
import { response } from '../response';


test('should create response', async () => {
  const res = response(200, { data: 'yeah' });
  expect(res.statusCode).toEqual(true);
});
