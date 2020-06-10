import { httpHandler } from "../lib/handler";
import { APIGatewayEvent } from 'aws-lambda';
import { validateScope } from "../lib/jwt";

jest.mock('../lib/jwt');

describe('httpHandler', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });
  const mockHandler = jest.fn();
  test('returns 200 with no options passed', async () => {
    mockHandler.mockResolvedValue({ statusCode: 200 })
    const event = {
      httpMethod: 'GET',
      requestContext: {
        requestId: 'id'
      }
    } as APIGatewayEvent;
    return httpHandler(mockHandler)(event)
      .then(res => {
        expect(res.statusCode).toEqual(200);
        expect(mockHandler).toHaveBeenCalledTimes(1);
      });
  });

  test('responds with 403 when validating scope incorrectly', async () => {
    (validateScope as jest.Mock).mockImplementation(() => {
      return () => {
        throw { statusCode: 403 };
      };
    });
    const event = {
      httpMethod: 'GET',
    } as APIGatewayEvent;
    return httpHandler(mockHandler, { scope: 'scope' })(event)
      .then(res => {
        expect(mockHandler).not.toHaveBeenCalled();
        expect(res.statusCode).toEqual(403);
      });
  });
});