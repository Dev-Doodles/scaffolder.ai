export type ToolResponse<T> = {
  body?: T;
  status: 'success' | 'failure';
};
