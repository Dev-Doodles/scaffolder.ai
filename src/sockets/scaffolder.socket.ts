import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  ScaffolderResponse,
  ScaffolderService,
} from '../services/scaffolder-service.js';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ScaffolderGateway {
  private readonly logger: Logger;

  constructor(private scaffolderService: ScaffolderService) {
    this.logger = new Logger(this.constructor.name);
  }

  @SubscribeMessage('chat')
  async handleEvent(@MessageBody() data: string): Promise<ScaffolderResponse> {
    this.logger.log('Received event:', data, 'from client');
    return await this.scaffolderService.invoke(data);
  }
}
