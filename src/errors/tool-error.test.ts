import { describe, it, expect } from 'vitest';
import { ToolError } from './tool-error.js';
import { GitClientError, GitClientErrorType } from './git-client-error.js';

describe('ToolError', () => {
  describe('with GitClientError as original', () => {
    it('should wrap GitClientError and preserve its id', () => {
      const gitError = new GitClientError(
        GitClientErrorType.REPOSITORY_CREATION_FAILED,
        'Failed to create repo',
      );

      const toolError = new ToolError(gitError);

      expect(toolError.id).toBe(GitClientErrorType.REPOSITORY_CREATION_FAILED);
      expect(toolError.name).toBe('ToolError >> GitClientError');
      expect(toolError.message).toBe('Failed to create repo');
    });

    it('should include GitClientError stack in ToolError stack', () => {
      const gitError = new GitClientError(
        GitClientErrorType.PUSH_FAILED,
        'Push failed',
      );

      const toolError = new ToolError(gitError);

      expect(toolError.stack).toContain('Caused by:');
    });

    it('should ignore provided message when original is GitClientError', () => {
      const gitError = new GitClientError(
        GitClientErrorType.INVALID_REMOTE,
        'Invalid remote URL',
      );

      const toolError = new ToolError(
        gitError,
        'This message should be ignored',
      );

      expect(toolError.message).toBe('Invalid remote URL');
    });

    it('should ignore methodName when original is GitClientError', () => {
      const gitError = new GitClientError(
        GitClientErrorType.COMMIT_FAILED,
        'Commit failed',
      );

      const toolError = new ToolError(gitError, 'message', 'someMethod');

      expect(toolError.name).toBe('ToolError >> GitClientError');
      expect(toolError.name).not.toContain('someMethod');
    });
  });

  describe('with regular Error as original', () => {
    it('should create ToolError with general error id', () => {
      const originalError = new Error('Something went wrong');

      const toolError = new ToolError(originalError);

      expect(toolError.id).toBe(1000); // GENERAL_TOOL_ERROR_ID
      expect(toolError.message).toBe('Something went wrong');
    });

    it('should use provided message over original error message', () => {
      const originalError = new Error('Original message');

      const toolError = new ToolError(originalError, 'Custom message');

      expect(toolError.message).toBe('Custom message');
    });

    it('should include methodName in error name when provided', () => {
      const originalError = new Error('Failed');

      const toolError = new ToolError(
        originalError,
        'Operation failed',
        'createRepository',
      );

      expect(toolError.name).toBe('ToolError >> createRepository');
    });

    it('should not include methodName in error name when not provided', () => {
      const originalError = new Error('Failed');

      const toolError = new ToolError(originalError, 'Operation failed');

      expect(toolError.name).toBe('ToolError ');
    });
  });

  describe('with non-Error as original', () => {
    it('should handle string as original', () => {
      const toolError = new ToolError('string error');

      expect(toolError.id).toBe(1000);
      expect(toolError.message).toBe('Tool error');
    });

    it('should handle null as original', () => {
      const toolError = new ToolError(null);

      expect(toolError.id).toBe(1000);
      expect(toolError.message).toBe('Tool error');
    });

    it('should handle undefined as original', () => {
      const toolError = new ToolError(undefined);

      expect(toolError.id).toBe(1000);
      expect(toolError.message).toBe('Tool error');
    });

    it('should handle object as original', () => {
      const toolError = new ToolError({ code: 500 });

      expect(toolError.id).toBe(1000);
      expect(toolError.message).toBe('Tool error');
    });

    it('should use provided message for non-Error original', () => {
      const toolError = new ToolError('string error', 'Custom message');

      expect(toolError.message).toBe('Custom message');
    });

    it('should include methodName for non-Error original', () => {
      const toolError = new ToolError(null, 'Failed', 'deleteRepository');

      expect(toolError.name).toBe('ToolError >> deleteRepository');
    });
  });

  describe('id getter', () => {
    it('should return the correct id via getter', () => {
      const gitError = new GitClientError(
        GitClientErrorType.REPOSITORY_DELETION_FAILED,
        'Deletion failed',
      );
      const toolError = new ToolError(gitError);

      const id = toolError.id;

      expect(id).toBe(GitClientErrorType.REPOSITORY_DELETION_FAILED);
    });

    it('should return general error id for non-GitClientError', () => {
      const toolError = new ToolError(new Error('test'));

      expect(toolError.id).toBe(1000);
    });
  });
});
