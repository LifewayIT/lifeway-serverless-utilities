import EventRouter from '../lib/eventRouter';

const generateSNSEvent = (eventType, payload) => {
  return {
    Records: [
      {
        Sns: {
          Message: JSON.stringify({ id: Math.random().toString(36).substring(7), payload, version: 1, eventType})
        }
      }
    ]
  };
};

const generateKinesisEvent = (events = []) => {

  const records = events.map(evt => {
    const jsonString = JSON.stringify({ id: Math.random().toString(36).substring(7), payload: evt.payload, version: 1, eventType: evt.eventType});
    return {
      kinesis: {
        data: Buffer.from(jsonString, 'utf8').toString('base64')
      }
    };
  });
  return {
    Records: records
  };
};

describe('eventRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const tateHandler = jest.fn();
  const charlieHandler = jest.fn();
  const exampleRules = [
    {
      eventType: 'TateTookLunch',
      handlers: [tateHandler],
    },
    {
      eventType: 'CharlieTookLunch',
      handlers: [charlieHandler]
    },
    {
      eventType: 'TeamLunchHappened',
      handlers: [charlieHandler, tateHandler]
    },
  ];

  it('should route to tate handler -- sns', (done) => {
    tateHandler.mockResolvedValue('Yay');
    EventRouter.route(exampleRules, { source: 'SNS', gaurenteeOrder: true })(generateSNSEvent('TateTookLunch', { foo: 'bar'}))
      .then(res => {
        expect(tateHandler).toHaveBeenCalledTimes(1);
        expect(res).toContain('Completed processing 1 event(s): [ Yay ]');
        done();
      });
  });

  it('should not route when enabled option is false', (done) => {
    tateHandler.mockResolvedValue('Yay');
    EventRouter.route(exampleRules, { source: 'SNS', gaurenteeOrder: true, enabled: false })(generateSNSEvent('TateTookLunch', { foo: 'bar'}))
      .then(res => {

        expect(tateHandler).toHaveBeenCalledTimes(0);
        expect(res).toEqual('Bypassed lifeway event consumers.');
        done();
      });
  });

  it('should route to charlie handler -- sns', (done) => {
    charlieHandler.mockResolvedValue('Yay');
    EventRouter.route(exampleRules, { source: 'SNS', gaurenteeOrder: false })(generateSNSEvent('CharlieTookLunch', { foo: 'bar'}))
      .then(res => {
        expect(charlieHandler).toHaveBeenCalledTimes(1);
        expect(res).toContain('Completed processing 1 event(s): [ Yay ]');
        done();
      });
  });

  it('should route to all handlers -- sns', (done) => {
    charlieHandler.mockResolvedValue('Yay');
    tateHandler.mockResolvedValue('Yay');
    EventRouter.route(exampleRules, { source: 'SNS', gaurenteeOrder: false })(generateSNSEvent('TeamLunchHappened', { foo: 'bar'}))
      .then(res => {
        expect(charlieHandler).toHaveBeenCalledTimes(1);
        expect(res).toContain('Completed processing 1 event(s): [ Yay,Yay ]');
        done();
      });
  });

  it('should route to tate handler -- kinesis', (done) => {
    tateHandler.mockResolvedValue('Yay');
    EventRouter.route(exampleRules, { source: 'kinesis', gaurenteeOrder: true })(generateKinesisEvent([{eventType: 'TateTookLunch', payload: { foo: 'bar'}}]))
      .then(res => {
        expect(tateHandler).toHaveBeenCalledTimes(1);
        expect(res).toContain('Completed processing 1 event(s): [ Yay ]');
        done();
      });
  });

  it('should route to tate handler after ingoring an unkown event -- kinesis', (done) => {
    tateHandler.mockResolvedValue('Yay');
    EventRouter.route(exampleRules, { source: 'kinesis', gaurenteeOrder: true })(generateKinesisEvent([
      { eventType: 'TateUpdatedSlackStatus', payload: { foo: 'bar' }},
      {eventType: 'TateTookLunch', payload: { foo: 'bar'}}
    ]))
      .then(res => {
        expect(tateHandler).toHaveBeenCalledTimes(1);
        expect(res).toContain('Completed processing 2 event(s): [ No handlers defined for eventType TateUpdatedSlackStatus | Yay ]');
        done();
      });
  });

  it('should route to all handlers -- kinesis', (done) => {
    tateHandler.mockResolvedValue('Yay');
    charlieHandler.mockImplementation(() => {
      return new Promise((res) => {
        setTimeout(() => res('Yay'), Math.random() * 1000);
      });
    });
    EventRouter.route(exampleRules)(generateKinesisEvent([
      {eventType: 'TateTookLunch', payload: { foo: 'bar'}},
      {eventType: 'CharlieTookLunch', payload: { foo: 'bar'}},
      {eventType: 'TeamLunchHappened', payload: { foo: 'bar'}}
    ]))
      .then(res => {
        expect(tateHandler).toHaveBeenCalledTimes(2);
        expect(charlieHandler).toHaveBeenCalledTimes(2);
        expect(res).toContain('Completed processing 3 event(s): [ Yay | Yay | Yay,Yay ]');
        done();
      });
  });

  it('should handle unknown type', (done) => {
    charlieHandler.mockResolvedValue('Yay');
    tateHandler.mockResolvedValue('Yay');
    EventRouter.route(exampleRules, { source: 'SNS', gaurenteeOrder: false })(generateSNSEvent('NoSuchEvent', { you: 'suck'}))
      .then(res => {
        expect(charlieHandler).not.toHaveBeenCalled();
        expect(tateHandler).not.toHaveBeenCalled();
        expect(res).toContain('No handlers triggered for events [ NoSuchEvent ]');
        done();
      });
  });

  it('should get events from kinesis', () => {
    const events = EventRouter.getEventsFromKinesis(generateKinesisEvent([
      {eventType: 'TateTookLunch', payload: { foo: 'bar'}},
      {eventType: 'CharlieTookLunch', payload: { foo: 'bar'}},
      {eventType: 'TeamLunchHappened', payload: { foo: 'bar'}}
    ]));
    expect(events.length).toEqual(3);
  });
});
