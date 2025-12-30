import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScaffolderConfig } from './scaffolder.config.js';
import { ConfigService } from '@nestjs/config';

vi.mock('@openai/agents', () => ({
  setDefaultOpenAIKey: vi.fn(),
}));

import { setDefaultOpenAIKey } from '@openai/agents';

describe('ScaffolderConfig', () => {
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with all config values from chatGPT config', () => {
    const mockConfig = {
      apiKey: 'sk-test-api-key-12345',
      model: 'gpt-4o',
      systemPrompt: 'You are a helpful assistant.',
      name: 'ScaffolderAgent',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const scaffolderConfig = new ScaffolderConfig(configService);

    expect(configService.get).toHaveBeenCalledWith('chatGPT', { infer: true });
    expect(scaffolderConfig.apiKey).toBe('sk-test-api-key-12345');
    expect(scaffolderConfig.model).toBe('gpt-4o');
    expect(scaffolderConfig.systemPrompt).toBe('You are a helpful assistant.');
    expect(scaffolderConfig.name).toBe('ScaffolderAgent');
  });

  it('should call setDefaultOpenAIKey with the apiKey', () => {
    const mockConfig = {
      apiKey: 'sk-openai-key-for-default',
      model: 'gpt-4',
      systemPrompt: 'Test prompt',
      name: 'TestAgent',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    new ScaffolderConfig(configService);

    expect(setDefaultOpenAIKey).toHaveBeenCalledWith('sk-openai-key-for-default');
  });

  it('should handle config without optional systemPrompt', () => {
    const mockConfig = {
      apiKey: 'sk-api-key',
      model: 'gpt-3.5-turbo',
      name: 'Agent',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const scaffolderConfig = new ScaffolderConfig(configService);

    expect(scaffolderConfig.systemPrompt).toBeUndefined();
    expect(scaffolderConfig.model).toBe('gpt-3.5-turbo');
  });

  it('should handle config without optional name', () => {
    const mockConfig = {
      apiKey: 'sk-api-key',
      model: 'gpt-4o-mini',
      systemPrompt: 'System prompt here',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const scaffolderConfig = new ScaffolderConfig(configService);

    expect(scaffolderConfig.name).toBeUndefined();
    expect(scaffolderConfig.systemPrompt).toBe('System prompt here');
  });

  it('should handle minimal config with only required fields', () => {
    const mockConfig = {
      apiKey: 'sk-minimal-key',
      model: 'gpt-4',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const scaffolderConfig = new ScaffolderConfig(configService);

    expect(scaffolderConfig.apiKey).toBe('sk-minimal-key');
    expect(scaffolderConfig.model).toBe('gpt-4');
    expect(scaffolderConfig.systemPrompt).toBeUndefined();
    expect(scaffolderConfig.name).toBeUndefined();
    expect(setDefaultOpenAIKey).toHaveBeenCalledWith('sk-minimal-key');
  });
});

