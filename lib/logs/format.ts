type Formatable = Error | object | string

export const formatJson = (data: object) => JSON.stringify(data, null, 2);

export const formatError = (error: Error) => formatJson({
  name: error.name,
  message: error.message,
  stack: error.stack,
});

export const format = (message: Formatable) => {
  if (message instanceof Error) {
    return formatError(message);
  } else if (typeof message === 'object') {
    return formatJson(message);
  } else {
    return message;
  }
};

export const formatMessages = (messages: Formatable[]) => messages.map(format);