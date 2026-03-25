import pino from 'pino';
import { getEnv } from './env.js';

let _logger: pino.Logger | null = null;

export function initLogger(): pino.Logger {
  const env = getEnv();

  _logger = pino({
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
    } : {}),
    // Production: plain JSON to stdout (for Azure Application Insights / log aggregators)
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: (req) => ({
        method: req.method,
        url: req.url,
        remoteAddress: req.ip,
      }),
    },
  });

  return _logger;
}

export function getLogger(): pino.Logger {
  if (!_logger) throw new Error('Call initLogger() before getLogger()');
  return _logger;
}

/** Create a child logger with a component name */
export function createLogger(component: string): pino.Logger {
  return getLogger().child({ component });
}
