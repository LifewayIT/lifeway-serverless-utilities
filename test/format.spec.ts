import { formatJson, formatError, format, formatMessages } from "../lib/format";

class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}

describe('formatJson', () => {
  it('stringifies an object', () => {
    const stringified = formatJson({ foo: 'bar' });
    expect(JSON.parse(stringified)).toEqual({ foo: 'bar' });
  });
});

describe('formatError', () => {
  it('stringifies an error with the name and message', () => {
    const error = new CustomError('some message');
    const stringified = formatError(error);

    expect(JSON.parse(stringified)).toEqual(expect.objectContaining({
      name: 'CustomError',
      message: 'some message'
    }));
  });

  it('includes the stack trace', () => {
    const error = new CustomError('some message');
    const stringified = formatError(error);

    expect(JSON.parse(stringified)).toEqual(expect.objectContaining({
      stack: expect.any(String)
    }));
  });
});

describe('format', () => {
  it('formats errors', () => {
    const error = new CustomError('some message');
    const stringified = format(error);

    expect(JSON.parse(stringified)).toEqual(expect.objectContaining({
      name: 'CustomError',
      message: 'some message',
      stack: expect.any(String)
    }));
  });

  it('formats raw objects', () => {
    const stringified = format({ foo: 'bar' });
    expect(JSON.parse(stringified)).toEqual({ foo: 'bar' });
  });

  it('does not modify strings', () => {
    const message = 'this is a message';
    expect(format(message)).toEqual(message);
  });
});

describe('formatMessages', () => {
  it('formats a list of messages', () => {
    const stringifiedList = formatMessages(['message', { foo: 'bar' }]);
    expect(stringifiedList.length).toEqual(2);
    expect(stringifiedList[0]).toEqual('message');
    expect(JSON.parse(stringifiedList[1])).toEqual({ foo: 'bar' });
  });
});
