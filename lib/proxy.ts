import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import DefaultAxios, { AxiosInstance, Method, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import fromEntries from 'object.fromentries';
import { pathToRegexp } from 'path-to-regexp';
import { inspect } from 'util';
import { httpHandler } from './handler';
import { logger } from './logger';
import { parseBody } from './request';
import { response } from './response';

const logPrefix = '[PROXY]';

/**
 * Parsing Axios Responses with a lot of data can result in
 * stack overflow exceptions.
 * As simple work around is to use Nodes built in inspect util.
 */
const logWithInspect = (logFn: (...args: unknown[]) => void, message: unknown, ...args: unknown[]) => {
  const inspectedArgs = args.map(arg => inspect(arg));
  logFn(logPrefix, message, ...inspectedArgs);
};

const isResponse = (error: unknown): error is APIGatewayProxyResult =>
  typeof error === 'object' && error != null && 'statusCode' in error;

const logAndReturnErrorResponse = (error: unknown) => {
  logger.error(logPrefix, error);
  if (isResponse(error)) {
    return error;
  } else {
    return response(500, 'Internal Server Error');
  }
};

export interface ProxyOptions {
  scope?: string,
  upstreamRequestOptions?: UpstreamRequestOptions,
}

export interface UpstreamRequestOptions {
  axiosInstance?: AxiosInstance,
}

export interface ProxiedIncomingRequest {
  path: string;
  method?: Method;
}

export interface ProxiedUpstreamRequest {
  url?: string;
  method?: Method;
  params?: any;
  headers?: any;
  data?: any;
  pathParameters?: any;
  config?: AxiosRequestConfig;
}

export interface HttpResponse {
  statusCode: number;
  data?: any;
  headers?: any;
}

export interface ProxiedRouteRule {
  incomingRequest: ProxiedIncomingRequest;
  upstreamRequest?: ProxiedUpstreamRequest;
  responseTransformer?: (response: HttpResponse, event: APIGatewayEvent) => HttpResponse;
  authorization?: (event: APIGatewayEvent) => Promise<boolean>;
  scope?: string;
}

export const findMatchingRoutingRule = (
  event: APIGatewayEvent,
  routingRules: ProxiedRouteRule[],
) => {
  logger.debug(logPrefix, 'Finding Matching Route Rule --', { routingRules, event: { resource: event?.resource, httpMethod: event?.httpMethod } });
  return routingRules.find(({ incomingRequest }) =>
    (incomingRequest?.path && (
      new RegExp(incomingRequest.path)?.test(event?.resource) ||
      pathToRegexp(incomingRequest.path)?.test(event?.resource)
    ) &&
      (
        !incomingRequest?.method || // match any method
        incomingRequest?.method?.toUpperCase() === event?.httpMethod?.toUpperCase()
      )
    ));
};

export const validateRouteRule = async (routeRule: ProxiedRouteRule) => {
  logger.debug(logPrefix, 'Validating Route Rule --', routeRule);
  const isValid = routeRule?.incomingRequest?.path;
  if (!isValid) {
    const message = 'Route rule is not valid';
    logger.critical(logPrefix, message, routeRule);
    return Promise.reject(message);
  }
  return routeRule;
};

type PathParameters = { [name: string]: ((event: APIGatewayEvent) => string) | string } | null;

export const replacePathParameters = async (
  event: APIGatewayEvent,
  url?: string,
  pathParameters?: PathParameters
) =>
  url?.replace(/:(\w+)/g, (_, key) => {
    const parameters: any = {
      ...event?.pathParameters,
      ...pathParameters,
    };
    const value: unknown = parameters?.[key];
    return typeof value === 'function'
      ? value(event)
      : value;
  });

const mapUpstreamObjectToConfig = (event: APIGatewayEvent, obj: Record<string, unknown>) =>
  fromEntries(
    Object
      .entries(obj)
      .map(([key, value]) => [key, typeof value === 'function' ? value(event) : value])
      .filter(([key, value]) => typeof value !== 'undefined')
  );

export const buildParams = (event: APIGatewayEvent, routeRule: ProxiedRouteRule) => ({
  ...event?.queryStringParameters,
  ...routeRule?.upstreamRequest?.params &&
  mapUpstreamObjectToConfig(event, routeRule.upstreamRequest.params)
});

export const buildHeaders = (event: APIGatewayEvent, routeRule: ProxiedRouteRule) => ({
  ...routeRule?.upstreamRequest?.headers &&
  mapUpstreamObjectToConfig(event, routeRule.upstreamRequest.headers)
});

export const buildData = (event: APIGatewayEvent, routeRule: ProxiedRouteRule) => {
  const body = parseBody(event);
  if (Array.isArray(body)) {
    return [
      ...body,
      ...routeRule?.upstreamRequest?.data ? routeRule.upstreamRequest.data : []
    ]
      .map(value => typeof value === 'function' ? value(event) : value);
  } else {
    return {
      ...body,
      ...routeRule?.upstreamRequest?.data &&
      mapUpstreamObjectToConfig(event, routeRule.upstreamRequest.data)
    };
  }
};

const resolve = async (response: AxiosResponse): Promise<HttpResponse> => {
  logWithInspect(logger.debug, 'Upstream Response --', response);
  const { status, data, headers } = response;
  return Promise.resolve({
    statusCode: status,
    data,
    headers,
  });
};

export const handleError = async (error: AxiosError) => {
  if (error?.response) {
    logWithInspect(logger.info, 'Upstream Request was not Successful --', error);
    return resolve(error.response);
  } else if (error?.request) {
    logger.error(logPrefix, 'Failed to Make Upstream Request --', error);
    return Promise.reject(error.request);
  } else {
    logger.error(logPrefix, 'Network Error --', error);
    return Promise.reject(error);
  }
};

export const forward = async (config: AxiosRequestConfig, axios: AxiosInstance = DefaultAxios) => {
  logger.debug(logPrefix, 'Forwarding Request to Upstream Service --', config);
  return axios(config)
    .then(resolve)
    .catch(handleError);
};

export const handleProxiedRequest = async (
  event: APIGatewayEvent,
  routeRule: ProxiedRouteRule,
  config?: AxiosRequestConfig,
  options?: UpstreamRequestOptions,
) => {
  logger.debug(logPrefix, 'Handling Request --', { event, routeRule, config });
  return validateRouteRule(routeRule)
    .then(({ authorization }: ProxiedRouteRule) => {
      if (authorization) {
        logger.debug(logPrefix, 'Checking Request Authorization --', { event });
        return authorization(event)
          .then((authorized) => authorized
            ? Promise.resolve(routeRule)
            : Promise.reject(response(403, 'Unauthorized'))
          );
      } else {
        return routeRule;
      }
    })
    .then(({ upstreamRequest }: ProxiedRouteRule) => replacePathParameters(
      event,
      upstreamRequest?.url ? upstreamRequest.url : event?.path,
      upstreamRequest?.pathParameters
    ))
    .then(url => {
      const { headers: commonHeaders, ...baseConfig } = config ?? {};

      return forward({
        url,
        method: routeRule.upstreamRequest?.method || event?.httpMethod as Method,
        data: buildData(event, routeRule),
        params: buildParams(event, routeRule),
        headers: {
          ...commonHeaders,
          ...buildHeaders(event, routeRule)
        },
        ...baseConfig,
        ...routeRule?.upstreamRequest?.config,
      }, options?.axiosInstance);
    })
    .then(response =>
      routeRule.responseTransformer
        ? routeRule.responseTransformer(response, event)
        : response
    )
    .then(({ statusCode, data }) => response(statusCode, data))
    .catch(logAndReturnErrorResponse);
};

export const proxy = (routingRules: ProxiedRouteRule[], config: AxiosRequestConfig, options?: ProxyOptions) =>
  (event: APIGatewayEvent, context?: Context) => {
    logger.debug(logPrefix, 'Attempting to Proxy Route --', { event, routingRules, config, options });
    const rule = findMatchingRoutingRule(event, routingRules);
    return httpHandler(
      (event: APIGatewayEvent) =>
        rule
          ? handleProxiedRequest(event, rule, config, options?.upstreamRequestOptions)
          : response(405, 'Incoming request is not proxied'),
      { scope: rule?.scope || options?.scope }
    )(event, context);
  };
