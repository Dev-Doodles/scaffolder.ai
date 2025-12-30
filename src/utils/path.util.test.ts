import { describe, it, expect } from 'vitest';
import { getPath } from './path.util.js';

describe('path.util', () => {
  describe('getPath', () => {
    it('should return path relative to utils directory with single segment', () => {
      const result = getPath('test.txt');

      expect(result).toContain('utils');
      expect(result).toContain('test.txt');
      expect(result.endsWith('test.txt')).toBe(true);
    });

    it('should return path relative to utils directory with multiple segments', () => {
      const result = getPath('folder', 'subfolder', 'file.ts');

      expect(result).toContain('utils');
      expect(result).toContain('folder');
      expect(result).toContain('subfolder');
      expect(result).toContain('file.ts');
    });

    it('should return utils directory when no segments provided', () => {
      const result = getPath();

      expect(result).toContain('utils');
      expect(result.endsWith('utils')).toBe(true);
    });

    it('should handle parent directory navigation', () => {
      const result = getPath('..', 'other-folder', 'file.js');

      expect(result).toContain('other-folder');
      expect(result).toContain('file.js');
      expect(result).not.toContain('utils/other-folder');
    });

    it('should return absolute path', () => {
      const result = getPath('some-file.ts');

      // On Unix systems, absolute paths start with /
      // On Windows, they start with a drive letter
      expect(result.startsWith('/') || /^[A-Z]:\\/.test(result)).toBe(true);
    });
  });
});
