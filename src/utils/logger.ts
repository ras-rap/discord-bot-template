import { mkdirSync } from 'fs';
import { join } from 'path';

import pino, { type Logger } from 'pino';

const { NODE_ENV = 'development', LOG_LEVEL } = process.env;
const isProd = NODE_ENV === 'production';
const level = (LOG_LEVEL ?? (isProd ? 'info' : 'debug')).toLowerCase() as
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

const logDir = join(process.cwd(), 'logs');
if (isProd) mkdirSync(logDir, { recursive: true });

const transport = isProd
  ? pino.transport({
      targets: [
        {
          target: 'pino/file',
          level: 'info',
          options: { destination: join(logDir, 'app.log') },
        },
        {
          target: 'pino/file',
          level: 'error',
          options: { destination: join(logDir, 'error.log') },
        },
      ],
    })
  : pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
        ignore: 'pid,hostname',
      },
    });

export const logger: Logger = pino(
  {
    level,
    base: {},
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport,
);
