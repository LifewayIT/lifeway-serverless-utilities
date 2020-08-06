import { decode } from 'jsonwebtoken';
import { APIGatewayEvent } from 'aws-lambda';
import { RequestMiddleware, RequestMiddlewareMetadata } from './handler';

export const getDecodedJwt = (event: APIGatewayEvent): any => {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  return authHeader && decode(
    authHeader.replace('Bearer ', ''),
    { complete: true }
  );
};

export const validateScope =
  (scope?: string): RequestMiddleware =>
    async (md: RequestMiddlewareMetadata) => {
      const claims = getDecodedJwt(md.event)?.payload;
      if (!claims?.scope?.includes(scope)) {
        return Promise.reject({ statusCode: 403, message: `Must have scope ${scope}` });
      }
      return md;
    };
