import { jest } from '@jest/globals';

// Mock file system state
const mockFileSystem = new Map<string, string>();
const mockDirectories = new Set<string>();

// Mock fs methods
export const readFileSync = jest.fn((path: string, _encoding?: string) => {
  if (!mockFileSystem.has(path)) {
    const error = new Error(
      `ENOENT: no such file or directory, open '${path}'`
    ) as any;
    error.code = 'ENOENT';
    error.errno = -2;
    error.syscall = 'open';
    error.path = path;
    throw error;
  }
  return mockFileSystem.get(path);
});

export const writeFileSync = jest.fn((path: string, data: string) => {
  mockFileSystem.set(path, data);
});

export const existsSync = jest.fn((path: string) => {
  return mockFileSystem.has(path) || mockDirectories.has(path);
});

export const mkdirSync = jest.fn((path: string, _options?: any) => {
  mockDirectories.add(path);
});

export const unlinkSync = jest.fn((path: string) => {
  if (!mockFileSystem.has(path)) {
    const error = new Error(
      `ENOENT: no such file or directory, unlink '${path}'`
    ) as any;
    error.code = 'ENOENT';
    error.errno = -2;
    error.syscall = 'unlink';
    error.path = path;
    throw error;
  }
  mockFileSystem.delete(path);
});

export const readdirSync = jest.fn((path: string) => {
  if (!mockDirectories.has(path)) {
    const error = new Error(
      `ENOENT: no such file or directory, scandir '${path}'`
    ) as any;
    error.code = 'ENOENT';
    error.errno = -2;
    error.syscall = 'scandir';
    error.path = path;
    throw error;
  }

  // Return filenames for files in this directory
  const files: string[] = [];
  for (const filePath of mockFileSystem.keys()) {
    if (filePath.startsWith(path + '/' + '') && filePath !== path) {
      const relativePath = filePath.substring(path.length + 1);
      // Only include direct children (no subdirectories)
      if (!relativePath.includes('/')) {
        files.push(relativePath);
      }
    }
  }
  return files;
});

// Test utilities for controlling mock file system
export const __setMockFiles = (files: Record<string, string>) => {
  mockFileSystem.clear();
  Object.entries(files).forEach(([path, content]) => {
    mockFileSystem.set(path, content);
  });
};

export const __setMockDirectories = (directories: string[]) => {
  mockDirectories.clear();
  directories.forEach(dir => mockDirectories.add(dir));
};

export const __getMockFileSystem = () => ({
  files: Object.fromEntries(mockFileSystem),
  directories: Array.from(mockDirectories),
});

export const __clearMockFileSystem = () => {
  mockFileSystem.clear();
  mockDirectories.clear();
};

export const __resetMocks = () => {
  readFileSync.mockClear();
  writeFileSync.mockClear();
  existsSync.mockClear();
  mkdirSync.mockClear();
  unlinkSync.mockClear();
  readdirSync.mockClear();
  __clearMockFileSystem();
};

// Default export for compatibility
const fs = {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  readdirSync,
  __setMockFiles,
  __setMockDirectories,
  __getMockFileSystem,
  __clearMockFileSystem,
  __resetMocks,
};

export default fs;
