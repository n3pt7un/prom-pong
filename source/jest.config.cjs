module.exports = {
  projects: [
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
      },
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
      testPathIgnorePatterns: ['/node_modules/', '\\.cjs$'],
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      moduleFileExtensions: ['cjs', 'mjs', 'js'],
      testMatch: [
        '**/__tests__/**/*.test.cjs',
        '**/?(*.)+(spec|test).cjs',
        '**/__tests__/**/*.test.mjs',
        '**/?(*.)+(spec|test).mjs',
      ],
      transform: {},
    },
  ],
};
