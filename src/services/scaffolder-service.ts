import { Agent, AgentOutputType, run } from '@openai/agents';
import { AgentService, AgentResponseSchema } from '../interfaces/index.js';
import z from 'zod';
import { Injectable } from '@nestjs/common';
import { DEFAULT_SCAFFOLDER_PROMPT } from '../utils/index.js';
import { OpenAIGithubTool, OpenAIProjenTool } from '../tools/open-ai/index.js';
import { ScaffolderConfig } from '../config/scaffolder.config.js';
import { Logger } from '@nestjs/common';

const ScaffolderResponseSchema = AgentResponseSchema.extend({
  response: z.object({
    repositoryUrl: z.string().optional().nullable(),
    commitSHA: z.string().optional().nullable(),
    catalogPath: z.string().optional().nullable(),
  }),
});

export type ScaffolderResponse = z.infer<typeof ScaffolderResponseSchema>;

@Injectable()
export class ScaffolderService extends AgentService<
  ScaffolderResponse,
  ScaffolderConfig
> {
  private readonly _systemPrompt: string;
  private readonly _agent: Agent<unknown, AgentOutputType<ScaffolderResponse>>;
  private readonly logger: Logger;

  public get systemPrompt(): string {
    return this._systemPrompt;
  }

  constructor(
    private readonly githubTool: OpenAIGithubTool,
    private readonly projenTool: OpenAIProjenTool,
    readonly config: ScaffolderConfig,
  ) {
    super();
    this.logger = new Logger(this.constructor.name);
    const { model, systemPrompt } = this.config;

    this._systemPrompt = systemPrompt ?? DEFAULT_SCAFFOLDER_PROMPT;

    this._agent = new Agent({
      name: 'ScaffolderServiceAgent',
      model: model,
      instructions: this.systemPrompt,
      outputType: ScaffolderResponseSchema,
      tools: [...this.projenTool.getTools(), ...this.githubTool.getTools()],
    });
  }

  async invoke(userPrompt: string): Promise<ScaffolderResponse> {
    this.logger.log(`Invoking OpenAI with prompt:${userPrompt}`);
    const { finalOutput } = await run(this._agent, userPrompt);

    return finalOutput as ScaffolderResponse;
  }
}
