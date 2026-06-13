import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

app.listen(env.PORT, () => {
  logger.info(`AgroHub API Gateway running on port ${env.PORT}`);
  logger.info('Proxy targets', env.services);
});
