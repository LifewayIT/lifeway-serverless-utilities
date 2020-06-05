import loglevel from 'loglevel';
import { tap } from './utils/functional';
import { formatMessages } from './format';

const level: string = process.env.LOG_LEVEL ?? 'DEBUG';

interface Level {
  [key:string]: loglevel.LogLevelDesc;
}

const levels: Level = {
  [loglevel.levels.TRACE]: 'TRACE',
  [loglevel.levels.DEBUG]: 'DEBUG',
  [loglevel.levels.INFO]: 'INFO',
  [loglevel.levels.WARN]: 'WARN',
  [loglevel.levels.ERROR]: 'ERROR',
  [loglevel.levels.SILENT]: 'SILENT',

  TRACE: loglevel.levels.TRACE,
  DEBUG: loglevel.levels.DEBUG,
  INFO: loglevel.levels.INFO,
  WARN: loglevel.levels.WARN,
  ERROR: loglevel.levels.ERROR,
  SILENT: loglevel.levels.SILENT
};

const defaultLevel = levels[level] ?? loglevel.levels.INFO;
loglevel.setDefaultLevel(defaultLevel);

const originalFactory = loglevel.methodFactory;
loglevel.methodFactory = (methodName, logLevel, loggerName) => {
  const originalMethod = originalFactory(methodName, logLevel, loggerName);

  return (...messages) => {
    const mute = process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS;
    if (!mute) {
      originalMethod(`<${methodName.toUpperCase()}>`, ...formatMessages(messages));
    }
  };
};

loglevel.setLevel(loglevel.getLevel());

const expandedLogger = {
  ...loglevel,
  critical: (...args: any[]) => {
    loglevel.error('<CRITICAL>', ...args);
  },
};

export const logger = {
  ...expandedLogger,
  tap: {
    trace: tap(expandedLogger.trace),
    debug: tap(expandedLogger.debug),
    info: tap(expandedLogger.info),
    warn: tap(expandedLogger.warn),
    error: tap(expandedLogger.error),
    critical: tap(expandedLogger.critical),
  }
};

export default logger;