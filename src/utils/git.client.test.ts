import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { GitHubClient } from './git.client.js';
import { GitClientError, GitClientErrorType } from '../errors/index.js';
import { GitHubConfig } from '../config/github.config.js';
import * as git from 'isomorphic-git';
import { existsSync } from 'fs';

vi.mock('octokit', () => ({
  Octokit: vi.fn(
    class {
      request = vi.fn();
    },
  ),
}));

vi.mock('isomorphic-git', () => ({
  init: vi.fn(),
  addRemote: vi.fn(),
  branch: vi.fn(),
  add: vi.fn(),
  setConfig: vi.fn(),
  commit: vi.fn(),
  push: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {},
  existsSync: vi.fn(),
}));

describe('GitHubClient', () => {
  let gitHubClient: GitHubClient;
  let mockOctokitRequest: Mock;
  let mockConfig: GitHubConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      accessToken: 'test-token',
      organisation: 'test-org',
    } as GitHubConfig;

    gitHubClient = new GitHubClient(mockConfig);
    mockOctokitRequest = gitHubClient.octokit.request as unknown as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config containing organisation', () => {
      const client = new GitHubClient(mockConfig);

      expect(client.organisation).toBe('test-org');
    });

    it('should initialize without organisation', () => {
      const configWithoutOrg = {
        accessToken: 'test-token',
      } as GitHubConfig;

      const client = new GitHubClient(configWithoutOrg);

      expect(client.organisation).toBeUndefined();
    });
  });

  describe('createRepository', () => {
    const repositorySpec = {
      name: 'test-repo',
      description: 'Test repository',
      visibility: true,
      hasIssues: true,
      hasProjects: false,
      hasWiki: false,
    };

    it('should create repository in organisation', async () => {
      mockOctokitRequest.mockResolvedValue({
        data: { clone_url: 'https://github.com/test-org/test-repo.git' },
      });

      const result = await gitHubClient.createRepository(repositorySpec);

      expect(result).toBe('https://github.com/test-org/test-repo.git');
      expect(mockOctokitRequest).toHaveBeenCalledWith(
        'POST /orgs/{org}/repos',
        {
          name: 'test-repo',
          private: true,
          description: 'Test repository',
          has_issues: true,
          has_projects: false,
          has_wiki: false,
          org: 'test-org',
        },
      );
    });

    it('should create repository for user when no organisation', async () => {
      const configWithoutOrg = {
        accessToken: 'test-token',
      } as GitHubConfig;
      const clientWithoutOrg = new GitHubClient(configWithoutOrg);
      const mockRequest = (clientWithoutOrg as any).octokit.request;
      mockRequest.mockResolvedValue({
        data: { clone_url: 'https://github.com/user/test-repo.git' },
      });

      const result = await clientWithoutOrg.createRepository(repositorySpec);

      expect(result).toBe('https://github.com/user/test-repo.git');
      expect(mockRequest).toHaveBeenCalledWith('POST /user/repos', {
        name: 'test-repo',
        private: true,
        description: 'Test repository',
        has_issues: true,
        has_projects: false,
        has_wiki: false,
        org: undefined,
      });
    });

    it('should throw GitClientError when repository creation fails', async () => {
      mockOctokitRequest.mockRejectedValue(new Error('API error'));

      await expect(
        gitHubClient.createRepository(repositorySpec),
      ).rejects.toThrow(GitClientError);
      await expect(
        gitHubClient.createRepository(repositorySpec),
      ).rejects.toMatchObject({
        id: GitClientErrorType.REPOSITORY_CREATION_FAILED,
      });
    });
  });

  describe('deleteRepository', () => {
    it('should delete repository with specified owner', async () => {
      mockOctokitRequest.mockResolvedValue({});

      await gitHubClient.deleteRepository('test-repo', 'custom-owner');

      expect(mockOctokitRequest).toHaveBeenCalledWith(
        'DELETE /repos/{owner}/{repo}',
        {
          owner: 'custom-owner',
          repo: 'test-repo',
        },
      );
    });

    it('should delete repository using organisation when owner not specified', async () => {
      mockOctokitRequest.mockResolvedValue({});

      await gitHubClient.deleteRepository('test-repo');

      expect(mockOctokitRequest).toHaveBeenCalledWith(
        'DELETE /repos/{owner}/{repo}',
        {
          owner: 'test-org',
          repo: 'test-repo',
        },
      );
    });

    it('should throw GitClientError when repository deletion fails', async () => {
      mockOctokitRequest.mockRejectedValue(new Error('Not found'));

      await expect(gitHubClient.deleteRepository('test-repo')).rejects.toThrow(
        GitClientError,
      );
      await expect(
        gitHubClient.deleteRepository('test-repo'),
      ).rejects.toMatchObject({
        id: GitClientErrorType.REPOSITORY_DELETION_FAILED,
      });
    });
  });

  describe('addremote', () => {
    const validUrl = 'git@github.com:test-org/test-repo.git';
    const httpsUrl = 'https://github.com/test-org/test-repo.git';
    const invalidUrl = 'invalid-url';
    const testDir = '/tmp/test-project';

    it('should add remote to existing git repository', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await gitHubClient.addremote(testDir, validUrl);

      expect(git.init).not.toHaveBeenCalled();
      expect(git.addRemote).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        remote: 'origin',
        url: validUrl,
      });
    });

    it('should initialize git and add remote for non-git directory', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await gitHubClient.addremote(testDir, validUrl);

      expect(git.init).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        defaultBranch: 'main',
      });
      expect(git.addRemote).toHaveBeenCalled();
    });

    it('should accept https URL', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await gitHubClient.addremote(testDir, httpsUrl);

      expect(git.addRemote).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        remote: 'origin',
        url: httpsUrl,
      });
    });

    it('should throw GitClientError for invalid URL', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      await expect(gitHubClient.addremote(testDir, invalidUrl)).rejects.toThrow(
        GitClientError,
      );
      await expect(
        gitHubClient.addremote(testDir, invalidUrl),
      ).rejects.toMatchObject({
        id: GitClientErrorType.INVALID_REMOTE,
      });
    });

    it('should throw GitClientError when git init fails', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(git.init).mockRejectedValue(new Error('Init failed'));

      await expect(gitHubClient.addremote(testDir, validUrl)).rejects.toThrow(
        GitClientError,
      );
      await expect(
        gitHubClient.addremote(testDir, validUrl),
      ).rejects.toMatchObject({
        id: GitClientErrorType.INVALID_REMOTE_ORIGIN,
      });
    });

    it('should throw GitClientError when addRemote fails', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(git.addRemote).mockRejectedValue(
        new Error('Add remote failed'),
      );

      await expect(gitHubClient.addremote(testDir, validUrl)).rejects.toThrow(
        GitClientError,
      );
      await expect(
        gitHubClient.addremote(testDir, validUrl),
      ).rejects.toMatchObject({
        id: GitClientErrorType.INVALID_REMOTE_ORIGIN,
      });
    });

    it('should re-throw GitClientError without wrapping', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const originalError = new GitClientError(
        GitClientErrorType.INVALID_REMOTE,
        'Test error',
      );
      vi.mocked(git.addRemote).mockRejectedValue(originalError);

      await expect(gitHubClient.addremote(testDir, validUrl)).rejects.toThrow(
        originalError,
      );
    });
  });

  describe('commitAndPush', () => {
    const testDir = '/tmp/test-project';
    const testMessage = 'feat: initial commit';
    const testBranch = 'feature/test';

    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(git.branch).mockResolvedValue(undefined);
      vi.mocked(git.add).mockResolvedValue(undefined);
      vi.mocked(git.setConfig).mockResolvedValue(undefined);
      vi.mocked(git.commit).mockResolvedValue('abc123');
      vi.mocked(git.push).mockResolvedValue(undefined);
    });

    it('should commit and push with custom branch', async () => {
      await gitHubClient.commitAndPush(testDir, testMessage, testBranch);

      expect(git.branch).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        ref: testBranch,
        checkout: true,
      });
      expect(git.add).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        filepath: '.',
      });
      expect(git.commit).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        message: testMessage,
      });
      expect(git.push).toHaveBeenCalledWith({
        fs: expect.anything(),
        http: expect.anything(),
        dir: testDir,
        remote: 'origin',
        ref: testBranch,
        onAuth: expect.any(Function),
      });
    });

    it('should use default branch when not specified', async () => {
      await gitHubClient.commitAndPush(testDir, testMessage);

      expect(git.branch).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: 'feat/initial_scaffold',
        }),
      );
    });

    it('should throw GitClientError when not a git repository', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toThrow(GitClientError);
      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toMatchObject({
        id: GitClientErrorType.INVALID_REPOSITORY_FOLDER,
      });
    });

    it('should throw GitClientError when branch creation fails', async () => {
      vi.mocked(git.branch).mockRejectedValue(new Error('Branch failed'));

      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toThrow(GitClientError);
      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toMatchObject({
        id: GitClientErrorType.INVALID_BRANCH,
      });
    });

    it('should throw GitClientError when staging files fails', async () => {
      vi.mocked(git.add).mockRejectedValue(new Error('Add failed'));

      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toThrow(GitClientError);
      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toMatchObject({
        id: GitClientErrorType.COMMIT_FAILED,
      });
    });

    it('should throw GitClientError when commit fails', async () => {
      vi.mocked(git.commit).mockRejectedValue(new Error('Commit failed'));

      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toThrow(GitClientError);
      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toMatchObject({
        id: GitClientErrorType.COMMIT_FAILED,
      });
    });

    it('should throw GitClientError when push fails', async () => {
      vi.mocked(git.push).mockRejectedValue(new Error('Push failed'));

      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toThrow(GitClientError);
      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toMatchObject({
        id: GitClientErrorType.PUSH_FAILED,
      });
    });

    it('should set git config for user name and email before commit', async () => {
      await gitHubClient.commitAndPush(testDir, testMessage);

      expect(git.setConfig).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        path: 'user.name',
        value: 'Scaffolder AI',
      });
      expect(git.setConfig).toHaveBeenCalledWith({
        fs: expect.anything(),
        dir: testDir,
        path: 'user.email',
        value: 'scaffolder.ai@devdoodles.space',
      });
    });

    it('should throw GitClientError when setConfig fails', async () => {
      vi.mocked(git.setConfig).mockRejectedValue(new Error('Config failed'));

      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toThrow(GitClientError);
      await expect(
        gitHubClient.commitAndPush(testDir, testMessage),
      ).rejects.toMatchObject({
        id: GitClientErrorType.COMMIT_FAILED,
      });
    });
  });

  describe('onAuth callback', () => {
    it('should return auth object with access token as username', () => {
      const onAuth = (gitHubClient as any).onAuth;
      const auth = onAuth();

      expect(auth).toEqual({
        username: 'test-token',
      });
    });
  });
});
