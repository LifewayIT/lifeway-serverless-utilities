
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { validateScope } from './jwt';
import { addCorsHeaders } from './cors';
import { addRequestIdHeaders, errorResponse } from './response';
import { tap } from './utils/functional';
import logger from './logger';

type Handler = (event: APIGatewayEvent, context?: Context) => Promise<APIGatewayProxyResult>

type HttpHandlerOptions = {
  scope?: string,
  cors?: boolean,
  requestIdHeaders?: boolean
};

export type RequestMiddlewareMetadata = {
  event: APIGatewayEvent,
  context?: Context
};
export type RequestMiddleware = (md: RequestMiddlewareMetadata) => RequestMiddlewareMetadata | Promise<RequestMiddlewareMetadata>;
const RequestIdentity = (md: RequestMiddlewareMetadata) => md;
const optionalRequestMiddleware =
  (option: boolean | string | undefined, requestMiddleware: RequestMiddleware) =>
    option ? requestMiddleware : RequestIdentity;

export type ResponseMiddleware = (response: APIGatewayProxyResult) => APIGatewayProxyResult | Promise<APIGatewayProxyResult>;
const ResponseIdentity = (response: APIGatewayProxyResult) => response;
const optionalResponseMiddleware =
  (option: boolean | undefined, responseMiddleware: ResponseMiddleware)  =>
    option ? responseMiddleware : ResponseIdentity;

export const httpHandler =
  (handler: Handler, options?: HttpHandlerOptions) =>
  (event: APIGatewayEvent, context?: Context): Promise<APIGatewayProxyResult> => {
    const { scope, cors, requestIdHeaders } = options ?? { requestIdHeaders: true };
    return Promise
      .resolve({ event, context })
      .then(optionalRequestMiddleware(scope, validateScope(scope)))
      .then(({ event, context }) => handler(event, context))
      .then(optionalResponseMiddleware(cors, addCorsHeaders(event)))
      .then(optionalResponseMiddleware(requestIdHeaders, addRequestIdHeaders(event)))
      .then(tap(logger.debug))
      .catch(errorResponse)
};
