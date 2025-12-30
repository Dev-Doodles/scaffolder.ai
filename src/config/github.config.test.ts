import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubConfig } from './github.config.js';
import { ConfigService } from '@nestjs/config';

describe('GitHubConfig', () => {
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with accessToken and organisation from config', () => {
    const mockConfig = {
      accessToken: 'ghp_test_token_12345',
      organisation: 'my-org',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const githubConfig = new GitHubConfig(configService);

    expect(configService.get).toHaveBeenCalledWith('github', { infer: true });
    expect(githubConfig.accessToken).toBe('ghp_test_token_12345');
    expect(githubConfig.organisation).toBe('my-org');
  });

  it('should initialize with accessToken only when organisation is not provided', () => {
    const mockConfig = {
      accessToken: 'ghp_another_token_67890',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const githubConfig = new GitHubConfig(configService);

    expect(configService.get).toHaveBeenCalledWith('github', { infer: true });
    expect(githubConfig.accessToken).toBe('ghp_another_token_67890');
    expect(githubConfig.organisation).toBeUndefined();
  });

  it('should store readonly accessToken', () => {
    const mockConfig = {
      accessToken: 'ghp_readonly_test',
      organisation: 'test-org',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const githubConfig = new GitHubConfig(configService);

    expect(githubConfig.accessToken).toBe('ghp_readonly_test');
  });

  it('should handle empty organisation string', () => {
    const mockConfig = {
      accessToken: 'ghp_token',
      organisation: '',
    };

    configService = {
      get: vi.fn().mockReturnValue(mockConfig),
    } as unknown as ConfigService;

    const githubConfig = new GitHubConfig(configService);

    expect(githubConfig.organisation).toBe('');
  });
});
