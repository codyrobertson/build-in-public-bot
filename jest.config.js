module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test/**',
    '!src/cli.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^chalk$': '<rootDir>/src/test/mocks/chalk.js',
    '^ora$': '<rootDir>/src/test/mocks/ora.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|ansi-styles|strip-ansi|ansi-regex|supports-color|has-flag|is-unicode-supported|string-width|emoji-regex|get-east-asian-width|cli-spinners|log-update|ansi-escapes|onetime|mimic-fn|restore-cursor|signal-exit|is-interactive|cli-cursor)/)',
  ],
};