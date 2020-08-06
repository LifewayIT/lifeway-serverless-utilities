import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getOrigin } from './request';
import logger from './logger';

export const isAllowedOrigin = (origin: string): boolean => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['localhost'];
  return allowedOrigins.includes(origin);
};

export const addCorsHeaders =
  (event: APIGatewayEvent) =>
    (response: APIGatewayProxyResult): APIGatewayProxyResult => {
      logger.debug('Handler --', 'Adding Cors Headers', event, response);
      const origin = getOrigin(event);

      if (!origin) {
        return response;
      }

      const wildCardHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': false
      };

      const restrictedHeaders = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
        'Access-Control-Request-Headers': 'X-PINGOTHER, Content-Type',
        'Access-Control-Allow-Headers': 'Origin, origin, DNT, X-Mx-ReqToken, Keep-Alive, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type, Authorization, Cookie, Set-Cookie',
      };

      const corsHeaders = isAllowedOrigin(origin) ? restrictedHeaders : wildCardHeaders;

      return {
        ...response,
        headers: {
          ...response.headers,
          ...corsHeaders
        }
      };
    };
