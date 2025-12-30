import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitHubClient } from './utils/index.js';
import { ScaffolderService } from './services/scaffolder-service.js';
import { GitHubConfig } from './config/github.config.js';
import { ScaffolderConfig } from './config/scaffolder.config.js';
import { OpenAIGithubTool, OpenAIProjenTool } from './tools/open-ai/index.js';
import { ScaffolderGateway } from './sockets/index.js';
import chatgptConfig from './config/chatgpt.config.js';
import githubConfig from './config/git.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [chatgptConfig, githubConfig],
    }),
  ],
  providers: [
    OpenAIGithubTool,
    OpenAIProjenTool,
    ScaffolderConfig,
    GitHubConfig,
    GitHubClient,
    ScaffolderService,
    ScaffolderGateway,
  ],
})
export class AppModule {}
