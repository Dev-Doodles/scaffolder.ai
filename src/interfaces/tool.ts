import { Logger } from '@nestjs/common';
import { ToolError } from '../errors/index.js';

export abstract class ToolProvider<T> {
  protected readonly logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  protected handleError(
    error: unknown,
    message: string,
    methodName?: string,
  ): never {
    this.logger.error(message, error instanceof Error ? error.stack : error);

    throw new ToolError(error, message, methodName);
  }

  abstract getTools(): T[];
}
