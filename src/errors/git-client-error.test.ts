import { describe, it, expect } from 'vitest';
import { GitClientError, GitClientErrorType } from './git-client-error.js';

describe('GitClientError', () => {
  it('should create error with id and message', () => {
    const error = new GitClientError(
      GitClientErrorType.INVALID_REPOSITORY,
      'Repository not found',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('GitClientError');
    expect(error.id).toBe(GitClientErrorType.INVALID_REPOSITORY);
    expect(error.message).toBe('Repository not found');
  });

  it('should include cause message when cause is provided', () => {
    const cause = new Error('Network timeout');
    const error = new GitClientError(
      GitClientErrorType.REPOSITORY_CREATION_FAILED,
      'Failed to create repository',
      cause,
    );

    expect(error.message).toBe('Failed to create repository: Network timeout');
    expect(error.id).toBe(GitClientErrorType.REPOSITORY_CREATION_FAILED);
  });

  it('should append cause stack when cause has stack', () => {
    const cause = new Error('Original error');
    cause.stack = 'Error: Original error\n    at someFunction';

    const error = new GitClientError(
      GitClientErrorType.PUSH_FAILED,
      'Push failed',
      cause,
    );

    expect(error.stack).toContain('Caused by:');
    expect(error.stack).toContain('someFunction');
  });

  it('should not append cause stack when cause has no stack', () => {
    const cause = new Error('Original error');
    cause.stack = undefined;

    const error = new GitClientError(
      GitClientErrorType.COMMIT_FAILED,
      'Commit failed',
      cause,
    );

    expect(error.stack).not.toContain('Caused by:');
  });

  it('should handle error without cause', () => {
    const error = new GitClientError(
      GitClientErrorType.INVALID_BRANCH,
      'Invalid branch',
    );

    expect(error.message).toBe('Invalid branch');
    expect(error.stack).toBeDefined();
  });

  it('should work with all error types', () => {
    const errorTypes = [
      GitClientErrorType.INVALID_REPOSITORY,
      GitClientErrorType.REPOSITORY_CREATION_FAILED,
      GitClientErrorType.REPOSITORY_DELETION_FAILED,
      GitClientErrorType.PUSH_FAILED,
      GitClientErrorType.INVALID_REPOSITORY_FOLDER,
      GitClientErrorType.INVALID_REMOTE,
      GitClientErrorType.INVALID_REMOTE_ORIGIN,
      GitClientErrorType.INVALID_BRANCH,
      GitClientErrorType.COMMIT_FAILED,
    ];

    errorTypes.forEach((errorType) => {
      const error = new GitClientError(errorType, 'Test message');
      expect(error.id).toBe(errorType);
      expect(error.name).toBe('GitClientError');
    });
  });
});
