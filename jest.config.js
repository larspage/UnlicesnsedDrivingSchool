module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/server/**/*.test.js',
        '<rootDir>/tests/unit/models/**/*.test.js',
        '<rootDir>/tests/unit/services/fileService.test.js',
        '<rootDir>/tests/unit/services/gmailService.test.js',
        '<rootDir>/tests/unit/middleware/**/*.test.js',
        '<rootDir>/tests/unit/routes/**/*.test.js',
        '<rootDir>/tests/unit/utils/**/*.test.js'
      ],
      roots: ['<rootDir>/server', '<rootDir>/tests'],
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      collectCoverageFrom: [
        'server/**/*.{js}',
      ],
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.test.(ts|tsx)',
        '<rootDir>/tests/unit/components/**/*.test.(js|ts|tsx)',
        '<rootDir>/tests/unit/services/api.test.js'
      ],
      roots: ['<rootDir>/src', '<rootDir>/tests'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.jsx?$': 'babel-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      collectCoverageFrom: [
        'src/**/*.{ts,tsx,js,jsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
      ],
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/e2e/**/*.test.js'
      ],
      roots: ['<rootDir>/tests/e2e', '<rootDir>/server'],
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.js'],
      collectCoverageFrom: [
        'server/**/*.{js}',
      ],
    },
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};