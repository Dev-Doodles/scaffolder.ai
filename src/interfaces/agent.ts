import z from 'zod';

export const AgentRequestStatusSchema = z.enum(['success', 'failure']);

export type AgentRequestStatus = z.infer<typeof AgentRequestStatusSchema>;

export const AgentResponseSchema = z.object({
  response: z.object({}),
  status: AgentRequestStatusSchema,
  thoughts: z.string().optional().nullable(),
  errors: z
    .array(
      z.object({
        code: z.string().optional().nullable(),
        message: z.string(),
      }),
    )
    .default([]),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export interface IAgentConfig {
  apiKey: string;
  model: string;
  name?: string;
  systemPrompt?: string;
}

export abstract class AgentService<
  T extends AgentResponse,
  K extends IAgentConfig,
> {
  abstract readonly config: K;

  constructor() {}

  abstract invoke(prompt: string): Promise<T>;
}
