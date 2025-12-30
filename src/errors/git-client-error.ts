export enum GitClientErrorType {
  INVALID_REPOSITORY = 1001,
  REPOSITORY_CREATION_FAILED = 1002,
  REPOSITORY_DELETION_FAILED = 1003,
  PUSH_FAILED = 1004,
  INVALID_REPOSITORY_FOLDER = 2001,
  INVALID_REMOTE = 2002,
  INVALID_REMOTE_ORIGIN = 2003,
  INVALID_BRANCH = 2004,
  COMMIT_FAILED = 2005,
}

export class GitClientError extends Error {
  readonly id: GitClientErrorType;

  constructor(id: GitClientErrorType, message: string, cause?: Error) {
    super(`${message}${cause ? `: ${cause.message}` : ''}`);
    this.name = 'GitClientError';
    this.id = id;

    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by:${cause.stack}`;
    }
  }
}
