import { Injectable } from '@nestjs/common';
import { GithubTool } from '../github.js';
import { tool, Tool } from '@openai/agents';
import {
  DeleteRepositorySchema,
  DeleteRepositorySpec,
  LocalRepoSpec,
  LocalRepoSpecSchema,
  RepositorySchema,
  RepositorySpec,
} from '../schema.js';
import { GitHubClient } from '../../utils/git.client.js';

@Injectable()
export class OpenAIGithubTool extends GithubTool<Tool> {
  constructor(client: GitHubClient) {
    super(client);
  }

  getTools(): Tool[] {
    return [
      tool({
        name: 'create_github_repository',
        description: 'A tool to create a new GitHub repository.',
        parameters: RepositorySchema,
        strict: true,
        execute: (input: RepositorySpec) => this.createRepository(input),
      }),
      tool({
        name: 'add_remote_origin',
        description:
          'A tool to initialise git in local folder and add a remote origin to it.',
        parameters: LocalRepoSpecSchema,
        strict: true,
        execute: (input: LocalRepoSpec) => this.addRemoteOrigin(input),
      }),
      tool({
        name: 'checkin_files',
        description:
          'A tool to commit and push files from a local git repository to its remote origin.',
        parameters: LocalRepoSpecSchema,
        strict: true,
        execute: (input: LocalRepoSpec) => this.checkinFiles(input),
      }),
      tool({
        name: 'delete_github_repository',
        description:
          'A tool to delete a GitHub repository. Requires repository name and owner is defaulted to the organisation if not provided.',
        parameters: DeleteRepositorySchema,
        strict: true,
        execute: (input: DeleteRepositorySpec) => this.deleteRepository(input),
      }),
    ];
  }
}
