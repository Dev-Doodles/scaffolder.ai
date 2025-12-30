import convict, { Config } from 'convict';
import { IGitHubConfig } from './github.config.js';
import { IAgentConfig } from '../interfaces/index.js';
import { getPath } from '../utils/index.js';
import { load } from 'js-yaml';

export interface ConfigSchema {
  github: IGitHubConfig;
  chatGPT: IAgentConfig;
}

let config: Config<ConfigSchema>;
convict.addParser({
  extension: ['yaml', 'yml'],
  parse: load,
});

export const initConfig = (): Config<ConfigSchema> => {
  config = convict<ConfigSchema>({
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

  config.validate({ allowed: 'strict' });
  config.loadFile([
    getPath('../../configuration/default.yaml'),
    getPath(
      `../../configuration/${process.env.ENVIRONMENT || 'development'}.yaml`,
    ),
  ]);

  return config;
};

export const getConfig = (): Config<ConfigSchema> => {
  if (!config) {
    return initConfig();
  }

  return config;
};
