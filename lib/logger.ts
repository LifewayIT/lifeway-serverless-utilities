import logger from 'loglevel';
import { tap } from './utils/functional';
import { formatMessages } from './format';

const level: string = process.env.LOG_LEVEL ?? 'DEBUG';

interface Level {
  [key:string]: logger.LogLevelDesc;
}

const levels: Level = {
  [logger.levels.TRACE]: 'TRACE',
  [logger.levels.DEBUG]: 'DEBUG',
  [logger.levels.INFO]: 'INFO',
  [logger.levels.WARN]: 'WARN',
  [logger.levels.ERROR]: 'ERROR',
  [logger.levels.SILENT]: 'SILENT',

  TRACE: logger.levels.TRACE,
  DEBUG: logger.levels.DEBUG,
  INFO: logger.levels.INFO,
  WARN: logger.levels.WARN,
  ERROR: logger.levels.ERROR,
  SILENT: logger.levels.SILENT
};

const defaultLevel = levels[level] ?? logger.levels.INFO;
logger.setDefaultLevel(defaultLevel);

const originalFactory = logger.methodFactory;
logger.methodFactory = (methodName, logLevel, loggerName) => {
  const originalMethod = originalFactory(methodName, logLevel, loggerName);

  return (...messages) => {
    const mute = process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS;
    if (!mute) {
      originalMethod(`<${methodName.toUpperCase()}>`, ...formatMessages(messages));
    }
  };
};

logger.setLevel(logger.getLevel());

const expandedLogger = {
  ...logger,
  critical: (...args: any[]) => {
    logger.error('<CRITICAL>', ...args);
  },
};

export default {
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
