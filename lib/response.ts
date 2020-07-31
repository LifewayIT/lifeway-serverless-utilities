import { APIGatewayProxyResult, APIGatewayEvent  } from 'aws-lambda';
import { logger } from './logger';

const logPrefix = '[RESPONSE]';

const parseError = (error: Error) => ({
  message: `${error.name}: ${error.message}`,
  stack: error.stack,
});

const toObject = (data: any) => {
  if (data instanceof Error) {
    return parseError(data);
  } else if (typeof data === 'object') {
    return data;
  } else if (typeof data === 'string') {
    return { message: data };
  } else {
    return { value: data };
  }
};

const jsonResponse = (res: APIGatewayProxyResult, data: any) => ({
  ...res,
  headers: { ...res.headers, 'Content-Type': 'application/json' },
  body: JSON.stringify(toObject(data)),
});

const setContentByContentType = (res: any, data: any) => {
  const contentType = res.headers?.['Content-Type'] ?? 'application/json';
  return contentType === 'application/json'
    ? jsonResponse(res, data)
    : { ...res, body: data };
};

export const response = (statusCode: number, data: any, { headers = {}, ...options }: any = {}) => {
  const res = {
    isBase64Encoded: false,
    headers: {
      'Cache-control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...headers
    },
    ...options,
    statusCode,
  };
  return data || typeof data === 'boolean' ? setContentByContentType(res, data) : res;
};

export const validateResponse = async (response: APIGatewayProxyResult) => {
  logger.debug(logPrefix, 'Validating response', response);
  const contentType = response?.headers?.['Content-Type'];
  const isValid =
    (response?.statusCode && typeof response.statusCode === 'number') &&
    (!response?.body || contentType !== 'application/json' || (contentType === 'application/json' && typeof response.body === 'string')) &&
    (!response?.headers || typeof response.headers === 'object');

  if (!isValid) {
    logger.error(logPrefix, 'Constructed response is invalid', response);
    return Promise.reject('Response is invalid');
  }

  return response;
};

export const rejectWithStatus = (statusCode: number) => (error: Error) => Promise.reject({ statusCode, ...error,  });

interface Error {
  name: string;
  message: string;
  stack?: string;
  statusCode?: number;
}

export const errorResponse = (error: Error): APIGatewayProxyResult => {
  logger.error(logPrefix, error);
  return error.statusCode
    ? response(error.statusCode, error)
    : response(500,  error);
}

export const addRequestIdHeaders =
  (event: APIGatewayEvent) =>
  (response: APIGatewayProxyResult): APIGatewayProxyResult => {
    logger.debug(logPrefix, 'Adding request headers', event, response);
    return {
      ...response,
      headers: {
        ...response.headers,
        'x-aws-request-id': event.requestContext.requestId,
      }
  };
};
