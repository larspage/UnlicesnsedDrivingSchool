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
        '<rootDir>/tests/unit/services/reportService.test.js',
        '<rootDir>/tests/unit/middleware/**/*.test.js',
        '<rootDir>/tests/unit/routes/**/*.test.js',
        '<rootDir>/tests/unit/utils/**/*.test.js'
      ],
      roots: ['<rootDir>/server', '<rootDir>/tests'],
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!uuid/)',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '^uuid$': '<rootDir>/tests/mocks/uuid.js',
      },
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
      transformIgnorePatterns: [
        'node_modules/(?!uuid/)',
      ],
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
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};