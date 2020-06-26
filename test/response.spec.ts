import { response } from '../lib';
import { rejectWithStatus } from '../lib/response';

describe('build', () => {
  test('build basic response with only statusCode', () => {
    const statusCode = 200;
    expect(response(statusCode, undefined)).toEqual({ isBase64Encoded: false, statusCode, headers: {} });
  });

  test('build response overwriting default headers', () => {
    const headers = { 'content-type': 'application/js' };
    expect(response(200, undefined, { headers }))
      .toEqual(expect.objectContaining({ headers }));
  });

  test('build response overwriting default options', () => {
    const options = { isBase64Encoded: true };
    expect(response(200, undefined, options))
      .toEqual(expect.objectContaining({ isBase64Encoded: options.isBase64Encoded }));
  });

  test('error is parsed into json response body', () => {
    const error = new Error(':bomb:');
    expect(JSON.parse(response(200, error).body)).toEqual({
      message: `${error.name}: ${error.message}`,
      stack: error.stack,
    });
  });

  test('body message is equal to data when data is string', () => {
    const data = ':taco:';
    expect(JSON.parse(response(200, data).body)).toEqual({ message: data });
  });

  test('body is equal to data when data is object', () => {
    const data = { food: ':taco:' };
    expect(JSON.parse(response(200, data).body)).toEqual(data);
  });

  test('body value is equal to data when data is value object', () => {
    const data = false;
    expect(JSON.parse(response(200, data).body)).toEqual({ value: data });
  });
});

test('reject with status does not override statusCode of existing error', async () => {
  const res = Promise
    .reject({ statusCode: 420, message: 'tateisapoop' })
    .catch(rejectWithStatus(406));

  await expect(res).rejects.toEqual({ statusCode: 420, message: 'tateisapoop' })
});
