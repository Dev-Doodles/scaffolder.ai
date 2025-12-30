import { registerAs } from '@nestjs/config';
import { getConfig } from './config.js';

export default registerAs('chatGPT', () => {
  return getConfig().get('chatGPT');
});
