import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { initConfig } from './config/config.js';
import { WsAdapter } from '@nestjs/platform-ws';
import { ConsoleLogger } from '@nestjs/common';

initConfig();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'Scaffolder-AI',
      timestamp: true,
      json: true,
    }),
  });

  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(3000, '127.0.0.1');
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
