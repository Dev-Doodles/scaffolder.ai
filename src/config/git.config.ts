import { registerAs } from '@nestjs/config';
import { getConfig } from './config.js';

export default registerAs('github', () => {
  return getConfig().get('github');
});
