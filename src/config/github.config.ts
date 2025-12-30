import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IGitHubConfig {
  accessToken: string;
  organisation?: string;
}

@Injectable()
export class GitHubConfig implements IGitHubConfig {
  readonly accessToken: string;
  readonly organisation?: string;

  constructor(private configService: ConfigService) {
    const { accessToken, organisation } = this.configService.get<IGitHubConfig>(
      'github',
      { infer: true },
    ) as IGitHubConfig;

    this.accessToken = accessToken;
    this.organisation = organisation;
  }
}
