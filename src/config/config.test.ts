import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('convict', () => {
  const mockConfigInstance = {
    validate: vi.fn(),
    loadFile: vi.fn(),
    get: vi.fn(),
  };

  const mockConvict = vi.fn(() => mockConfigInstance);
  (mockConvict as any).addParser = vi.fn();

  return {
    default: mockConvict,
    __mockConfigInstance: mockConfigInstance,
    __mockConvict: mockConvict,
  };
});

vi.mock('js-yaml', () => ({
  load: vi.fn((content) => content),
}));

vi.mock('../utils/index.js', () => ({
  getPath: vi.fn(
    (...segments: string[]) => `/mocked/path/${segments.join('/')}`,
  ),
}));

describe('config', () => {
  let mockConvict: ReturnType<typeof vi.fn>;
  let mockConfigInstance: {
    validate: ReturnType<typeof vi.fn>;
    loadFile: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    const convictModule = await import('convict');
    mockConvict = (convictModule as any).__mockConvict;
    mockConfigInstance = (convictModule as any).__mockConfigInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convict parser setup', () => {
    it('should register yaml parser with convict', async () => {
      await import('./config.js');

      expect((mockConvict as any).addParser).toHaveBeenCalledWith({
        extension: ['yaml', 'yml'],
        parse: expect.any(Function),
      });
    });
  });

  describe('initConfig', () => {
    it('should create convict config with correct schema', async () => {
      const { initConfig } = await import('./config.js');

      initConfig();

      expect(mockConvict).toHaveBeenCalledWith({
        github: {
          accessToken: {
            doc: 'GitHub access token with repo and admin:org scopes',
            format: String,
            default: '',
            env: 'GITHUB_ACCESS_TOKEN',
          },
          organisation: {
            doc: 'GitHub organisation name',
            format: String,
            default: '',
            env: 'GITHUB_ORGANISATION',
          },
        },
        chatGPT: {
          model: {
            doc: 'ChatGPT model to use',
            format: String,
            default: 'gpt-5.2',
            env: 'CHATGPT_MODEL',
          },
          apiKey: {
            doc: 'API key for ChatGPT',
            format: String,
            default: '',
            env: 'CHATGPT_API_KEY',
          },
        },
      });
    });

    it('should validate config with strict mode', async () => {
      const { initConfig } = await import('./config.js');

      initConfig();

      expect(mockConfigInstance.validate).toHaveBeenCalledWith({
        allowed: 'strict',
      });
    });

    it('should load default and environment-specific config files', async () => {
      const { initConfig } = await import('./config.js');

      initConfig();

      expect(mockConfigInstance.loadFile).toHaveBeenCalledWith([
        expect.stringContaining('default.yaml'),
        expect.stringContaining('development.yaml'),
      ]);
    });

    it('should use ENVIRONMENT env var for config file selection', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      process.env.ENVIRONMENT = 'production';

      const { getPath } = await import('../utils/index.js');
      const { initConfig } = await import('./config.js');

      initConfig();

      expect(getPath).toHaveBeenCalledWith(
        '../../configuration/production.yaml',
      );

      process.env.ENVIRONMENT = originalEnv;
    });

    it('should default to development environment when ENVIRONMENT not set', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      delete process.env.ENVIRONMENT;

      const { getPath } = await import('../utils/index.js');
      const { initConfig } = await import('./config.js');

      initConfig();

      expect(getPath).toHaveBeenCalledWith(
        '../../configuration/development.yaml',
      );

      process.env.ENVIRONMENT = originalEnv;
    });

    it('should return the config instance', async () => {
      const { initConfig } = await import('./config.js');

      const result = initConfig();

      expect(result).toBe(mockConfigInstance);
    });

    it('should call getPath for both config files', async () => {
      const { getPath } = await import('../utils/index.js');
      const { initConfig } = await import('./config.js');

      initConfig();

      expect(getPath).toHaveBeenCalledWith('../../configuration/default.yaml');
      expect(getPath).toHaveBeenCalledWith(
        expect.stringContaining('../../configuration/'),
      );
    });
  });

  describe('getConfig', () => {
    it('should initialize config if not already initialized', async () => {
      const { getConfig } = await import('./config.js');

      const result = getConfig();

      expect(mockConvict).toHaveBeenCalled();
      expect(result).toBe(mockConfigInstance);
    });

    it('should return existing config on subsequent calls', async () => {
      const { initConfig, getConfig } = await import('./config.js');

      // First call initializes
      const firstResult = initConfig();

      // Clear mock calls
      mockConvict.mockClear();

      // Second call should return cached config
      const secondResult = getConfig();

      expect(mockConvict).not.toHaveBeenCalled();
      expect(secondResult).toBe(firstResult);
    });
  });

  describe('yaml parser', () => {
    it('should use js-yaml load function for parsing', async () => {
      const { load } = await import('js-yaml');
      await import('./config.js');

      // Get the parser that was registered
      const parserCall = (mockConvict as any).addParser.mock.calls[0][0];
      expect(parserCall.extension).toEqual(['yaml', 'yml']);

      // Test the parser function
      const testYaml = 'key: value';
      parserCall.parse(testYaml);

      expect(load).toHaveBeenCalledWith(testYaml);
    });
  });
});
