import { Octokit } from 'octokit';
import * as git from 'isomorphic-git';
import fs, { existsSync } from 'fs';
import { RepositorySpec } from '../tools/schema.js';
import http from 'isomorphic-git/http/node';
import { GitClientError, GitClientErrorType } from '../errors/index.js';
import { Injectable } from '@nestjs/common';
import { GitHubConfig } from '../config/github.config.js';

const GIT_URL_VALIDATOR: RegExp = /^(git@|https:\/\/)/;

/**
 * Helper to validate if local directory is a git repository
 * @param dir
 * @returns
 */
const validGitRepository = (dir: string): boolean => existsSync(`${dir}/.git`);

/**
 * Helper to validate git remote URL
 * @param url
 * @returns
 */
const validGitUrl = (url: string): boolean => {
  if (!GIT_URL_VALIDATOR.test(url)) {
    throw new GitClientError(
      GitClientErrorType.INVALID_REMOTE,
      'Invalid git remote URL',
    );
  }

  return true;
};

/**
 * Helper to create and checkout a new local branch
 * @param dir
 * @param branchName
 */
const checkoutAndBranch = async (
  dir: string,
  branchName: string,
): Promise<void> => {
  try {
    let res;
    res = await git.branch({
      fs,
      dir,
      ref: branchName,
      checkout: true,
    });
  } catch (error) {
    throw new GitClientError(
      GitClientErrorType.INVALID_BRANCH,
      `Failed to create and checkout branch`,
      error as Error,
    );
  }
};

/**
 * Helper to commit files to local git repository
 * @param dir
 * @param message
 */
const commitFiles = async (dir: string, message: string): Promise<void> => {
  try {
    await git.setConfig({
      fs,
      dir,
      path: 'user.name',
      value: 'Scaffolder AI',
    });

    await git.setConfig({
      fs,
      dir,
      path: 'user.email',
      value: 'scaffolder.ai@devdoodles.space',
    });

    await git.commit({
      fs,
      dir,
      message,
    });
  } catch (error) {
    throw new GitClientError(
      GitClientErrorType.COMMIT_FAILED,
      `Failed to commit files`,
      error as Error,
    );
  }
};

/**
 * Helper to push committed files and branch to remote repository
 * @param dir
 * @param branchName
 * @param onAuth
 */
const pushToRemote = async (
  dir: string,
  branchName: string,
  onAuth: git.AuthCallback,
): Promise<void> => {
  try {
    await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: branchName,
      onAuth,
    });
  } catch (error) {
    throw new GitClientError(
      GitClientErrorType.PUSH_FAILED,
      `Failed to push to remote repository`,
      error as Error,
    );
  }
};

const addFilesToCommit = async (dir: string): Promise<void> => {
  try {
    await git.add({
      fs,
      dir,
      filepath: '.',
    });
  } catch (error) {
    throw new GitClientError(
      GitClientErrorType.COMMIT_FAILED,
      `Failed to stage files for commit`,
      error as Error,
    );
  }
};

export interface IGitClient {
  createRepository(spec: RepositorySpec): Promise<string>;
  deleteRepository(owner: string, name: string): Promise<void>;
  addremote(dir: string, url: string): Promise<void>;
  commitAndPush(dir: string, message: string): Promise<void>;
}

@Injectable()
export class GitHubClient implements IGitClient {
  private readonly _octokit: Octokit;
  private readonly _organisation?: string;
  private readonly onAuth: git.AuthCallback;

  public get octokit(): Octokit {
    return this._octokit;
  }

  public get organisation(): string | undefined {
    return this._organisation;
  }

  public constructor(private config: GitHubConfig) {
    const { accessToken, organisation } = this.config;

    this._octokit = new Octokit({
      auth: accessToken,
    });

    this.onAuth = (): git.GitAuth => {
      return {
        username: accessToken,
      };
    };

    this._organisation = organisation;
  }

  /**
   * Creates a new repository on GitHub
   * @param
   * @returns
   */
  public async createRepository({
    name,
    visibility: isPrivate,
    hasIssues,
    hasProjects,
    hasWiki,
    description,
  }: RepositorySpec): Promise<string> {
    try {
      const { data } = await this.octokit.request(
        this.organisation ? 'POST /orgs/{org}/repos' : 'POST /user/repos',
        {
          name,
          private: isPrivate,
          description,
          has_issues: hasIssues,
          has_projects: hasProjects,
          has_wiki: hasWiki,
          org: this.organisation ?? undefined,
        },
      );
      return data.clone_url;
    } catch (error) {
      throw new GitClientError(
        GitClientErrorType.REPOSITORY_CREATION_FAILED,
        'Failed to create the repository on GitHub',
        error as Error,
      );
    }
  }

  /**
   * Deletes a repository on GitHub
   * @param owner The owner of the repository (user or organisation)
   * @param name The name of the repository
   */
  public async deleteRepository(name: string, owner?: string): Promise<void> {
    try {
      await this.octokit.request('DELETE /repos/{owner}/{repo}', {
        owner: owner ?? this.organisation,
        repo: name,
      });
    } catch (error) {
      throw new GitClientError(
        GitClientErrorType.REPOSITORY_DELETION_FAILED,
        `Failed to delete repository ${this.organisation}/${name}`,
        error as Error,
      );
    }
  }

  /**
   * Adds remote origin to the local git repository
   * @param dir
   * @param url
   */
  public async addremote(dir: string, url: string): Promise<void> {
    try {
      if (!validGitRepository(dir)) {
        await git.init({ fs, dir, defaultBranch: 'main' });
      }

      if (validGitUrl(url)) {
        await git.addRemote({
          fs,
          dir,
          remote: 'origin',
          url,
        });
      }
    } catch (error) {
      if (error instanceof GitClientError) {
        throw error;
      }

      throw new GitClientError(
        GitClientErrorType.INVALID_REMOTE_ORIGIN,
        `Failed to add initialise git repository and remote origin`,
        error as Error,
      );
    }
  }

  /**
   * Commits and pushes files to the remote repository
   * @param dir
   * @param message
   */
  public async commitAndPush(
    dir: string,
    message: string,
    branch?: string,
  ): Promise<void> {
    const branchName = branch ?? 'feat/initial_scaffold';

    if (!validGitRepository(dir)) {
      throw new GitClientError(
        GitClientErrorType.INVALID_REPOSITORY_FOLDER,
        'Commit and Push: Not a git repository',
      );
    }

    try {
      await checkoutAndBranch(dir, branchName);
      await addFilesToCommit(dir);
      await commitFiles(dir, message);
      await pushToRemote(dir, branchName, this.onAuth);
    } catch (error) {
      throw error as GitClientError;
    }
  }
}
