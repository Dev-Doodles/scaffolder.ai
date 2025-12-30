import { GitClientError } from './git-client-error.js';

const GENERAL_TOOL_ERROR_ID = 1000;

const isGitClientError = (e: unknown): e is GitClientError => {
  return (
    e instanceof Error &&
    e.name === 'GitClientError' &&
    typeof (e as any).id === 'number'
  );
};

export class ToolError extends Error {
  private readonly _id: number;

  public get id(): number {
    return this._id;
  }

  constructor(original: unknown, message?: string, methodName?: string) {
    super(
      message ?? (original instanceof Error ? original.message : 'Tool error'),
    );

    if (isGitClientError(original)) {
      this.name = `ToolError >> ${original.name}`;
      this._id = original.id;

      this.stack = `${this.stack}\nCaused by:${original.stack}`;
      this.message = original.message;

      return;
    }

    this.name = `ToolError ${methodName ? `>> ${methodName}` : ''}`;
    this._id = GENERAL_TOOL_ERROR_ID;
  }
}
