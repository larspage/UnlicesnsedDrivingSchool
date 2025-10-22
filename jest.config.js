module.exports = {
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/server/**/*.test.js',
        '<rootDir>/tests/unit/models/**/*.test.js',
        '<rootDir>/tests/unit/services/**/*.test.js',
        '<rootDir>/tests/unit/middleware/**/*.test.js',
        '<rootDir>/tests/unit/routes/**/*.test.js',
        '<rootDir>/tests/unit/utils/**/*.test.js',
        '<rootDir>/tests/e2e/**/*.test.js'
      ],
      testPathIgnorePatterns: [
        '<rootDir>/tests/unit/services/api.test.js',
        '<rootDir>/tests/e2e/photo-pager.test.js',
        '<rootDir>/tests/e2e/admin-status-change.test.js',
        '<rootDir>/tests/e2e/frontend-basic.test.js',
        '<rootDir>/tests/e2e/error-handling.test.js',
        '<rootDir>/tests/e2e/performance.test.js'
      ],
      roots: ['<rootDir>/server', '<rootDir>/tests'],
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!@paralleldrive/cuid2/)',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '^uuid$': '<rootDir>/tests/mocks/uuid.js',
        '^@paralleldrive/cuid2$': '<rootDir>/tests/mocks/cuid2.js',
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
        'node_modules/(?!@paralleldrive/cuid2|google-spreadsheet/)',
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
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};