import { APIGatewayEvent } from 'aws-lambda';

export const getOrigin = (event: APIGatewayEvent) => event?.headers && (event.headers.origin || event.headers.Origin);

export const parseBody = (event: APIGatewayEvent) =>
  event?.body && JSON.parse(
    event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body
  );

  export const getUserId = (event: APIGatewayEvent) => event.requestContext?.authorizer?.principalId;

  export const getSub = (event: APIGatewayEvent) => event.requestContext?.authorizer?.claims?.sub;