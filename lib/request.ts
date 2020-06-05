import { APIGatewayEvent } from 'aws-lambda';


type Event = Partial<APIGatewayEvent>;

export const getOrigin = (event: Event) => event?.headers && (event.headers.origin || event.headers.Origin);

export const parseBody = (event: Event) =>
  event?.body && JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);

export const getUserId = (event: Event) => event?.requestContext?.authorizer?.principalId;