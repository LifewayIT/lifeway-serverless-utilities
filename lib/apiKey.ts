import { RequestMiddlewareMetadata } from './handler';

export const validateApiKey = (apiKeys?: string[]) =>
  async (md: RequestMiddlewareMetadata) => {
    const requestedApiKey =  md.event.headers?.['x-api-key'];
    if (!apiKeys?.includes(requestedApiKey)) {
      return Promise.reject({ statusCode: 403, message: 'Incorrect x-api-key provided on request' });
    }
    return md;
  };
