import { IAgentConfig } from 'src/interfaces/index.js';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { setDefaultOpenAIKey } from '@openai/agents';

@Injectable()
export class ScaffolderConfig implements IAgentConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly systemPrompt?: string;
  readonly name?: string;

  constructor(private configService: ConfigService) {
    const gptConfig = this.configService.get<IAgentConfig>('chatGPT', {
      infer: true,
    }) as IAgentConfig;

    const { model, systemPrompt, name, apiKey } = gptConfig;
    this.model = model;
    this.systemPrompt = systemPrompt;
    this.name = name;
    this.apiKey = apiKey;

    setDefaultOpenAIKey(apiKey);
  }
}
