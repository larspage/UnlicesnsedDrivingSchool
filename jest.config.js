module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/server', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/?(*.)+(spec|test).js',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    'server/**/*.{js}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/?(*.)+(spec|test).js'],
      roots: ['<rootDir>/server'],
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/?(*.)+(spec|test).(ts|tsx)'],
      roots: ['<rootDir>/src'],
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};