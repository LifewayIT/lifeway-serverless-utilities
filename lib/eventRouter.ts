/* eslint-disable @typescript-eslint/no-use-before-define */

import logger from './logger';

const logPrefix = '[EVENT ROUTER]';

/**
 * @param {*} routerRules List of event router rules. Maps event types to handlers.
 * @param {*} options Router options.
 */
export const route = (
  routerRules: any,
  {
    source = 'KINESIS',
    gaurenteeOrder = false,
    enabled = true
  } = {}
) => {
  const validRules = routerRules.every((route: any) => 'handlers' in route && 'eventType' in route);

  if (!validRules) {
    throw new Error('Rules provided are not valid.');
  }

  return async (event: any) => {
    logger.debug(logPrefix, 'AWS Lambda Event --', event);
    const lifewayEvents = getEventsFromSource(event, source);

    return enabled
      ? processEvents(lifewayEvents, routerRules, gaurenteeOrder)
      : bypass(lifewayEvents);
  };
};

/**
 * @param {*} event AWS Lambda Kinesis Event (can contain many batched lifeway events.)
 */
export const getEventsFromKinesis = (event: any) => {
  const events = event
    .Records
    .map((record: any) => Buffer.from(record.kinesis.data, 'base64').toString('utf8'))
    .filter(isJSON)
    .map(JSON.parse)
    .filter(validLifewayEvent);
  logger.debug(logPrefix, 'Parsed events from kinesis --', events);
  return events;
};

/**
 * @param {*} event AWS Lambda SNS Event (will only ever contain a single lifeway event)
 */
const getEventsFromSNS = (event: any) => {
  const lifewayEventString = event.Records[0].Sns.Message;
  const lifewayEvent = JSON.parse(lifewayEventString);
  if (validLifewayEvent(lifewayEvent)) {
    return [lifewayEvent];
  } else {
    return [];
  }
};

/**
 * @param {*} event AWS Lambda Event (from kinesis or sns.... or whatever else we use in the future)
 * @param {*} source Configured source type.
 */
const getEventsFromSource = (event: any, source: any) => {
  switch (source.toUpperCase()) {
    case 'KINESIS':
      return getEventsFromKinesis(event);
    case 'SNS':
      return getEventsFromSNS(event);
    default:
      logger.critical('Error in Lifeway Event Handler Definition, no valid event source type specified.');
      throw new Error('No valid type specified ');
  }
};

/**
 * 
 * @param {*} events List of Lifeway Events
 * @param {*} routerRules List of event router rules. Maps event types to handlers.
 * @param {*} gaurenteeOrder Boolean flag for gaurenteeing that the events are processed in order.
 */
const processEvents = async (events: any, routerRules: any, gaurenteeOrder = false) => {
  const process = gaurenteeOrder ? processInOrder : processInAnyOrder;
  return process(events, routerRules);
};


const bypass = async (events: any) => {
  logger.info(logPrefix, 'Bypassing lifeway events --', events);
  return 'Bypassed lifeway event consumers.';
};

const processInOrder = async (events: any, routerRules: any) => {
  const results = [];
  for (const event of events) {
    const handlers = getHandlersForLifewayEvent(routerRules, event);
    logger.debug(logPrefix, 'Processing event --', event);
    if (handlers.length === 0) {
      const msg = `No handlers defined for eventType ${event.eventType}`;
      logger.warn(logPrefix, msg);
      results.push(msg);
    } else {
      const promise = Promise.all(handlers.map((handler: any) => handler(event).catch(handleError)));
      const res = await promise;
      logger.debug(logPrefix, `Event handlers processed event ${event.id} with result: [ ${res.join(' | ')} ]`);
      results.push(res);
    }
  }
  return handleResults(results, events);
};

const processInAnyOrder = async (events: any, routerRules: any) => Promise.all(events
  .map((event: any) => {
    logger.debug(logPrefix, 'Processing event --', event);
    const handlers = getHandlersForLifewayEvent(routerRules, event);
    if (handlers.length === 0) {
      logger.warn(logPrefix, 'No handlers defined for eventType --', event.eventType);
      return [];
    }
    return Promise.all(handlers.map((handler: any) => handler(event).catch(handleError)));
  }))
  .then(results => results.filter((list: any) => list.length > 0))
  .then(results => handleResults(results, events));

const getHandlersForLifewayEvent = (routerRules: any, event: any) => {
  const rule = routerRules.find((route: any) => route.eventType === event.eventType);
  return rule && rule.handlers || [];
};

const handleResults = (results: any, events: any) => {
  if (results.length === 0) {
    const msg = `${logPrefix} No handlers triggered for events [ ${events.map((event: any) => event.eventType).join(' | ')} ]`;
    logger.info(msg);
    return msg;
  }

  const msg = `${logPrefix} Completed processing ${events.length} event(s): [ ${results.join(' | ')} ]`;
  logger.info(msg);
  return msg;
};

const validLifewayEvent = (lifewayEvent: any) => {
  const isValid =
    Object.prototype.hasOwnProperty.call(lifewayEvent, 'eventType') &&
    Object.prototype.hasOwnProperty.call(lifewayEvent, 'payload') &&
    Object.prototype.hasOwnProperty.call(lifewayEvent, 'version') &&
    Object.prototype.hasOwnProperty.call(lifewayEvent, 'id');

  if (!isValid) {
    logger.error(logPrefix, 'Invalid Event Recieved from event source --', lifewayEvent);
  }

  return isValid;
};

const isJSON = (str: any) => {
  try {
    JSON.parse(str);
    return true;
  } catch (error) {
    return false;
  }
};

const handleError = async (error: any) => {
  if (error.retry) {
    logger.error(`<RETRYING> Recoverable error handling event --> ${JSON.stringify(error)}`);
    return Promise.reject(error);
  } else {
    if (error.critical) {
      logger.critical(`Unrecoverable error encountered in event handler--> ${JSON.stringify(error)}`);
    } else {
      logger.info(`${JSON.stringify(error)}`);
    }
    return JSON.stringify(error);
  }
};

export default {
  route,
  getEventsFromKinesis,
  getEventsFromSNS,
};
