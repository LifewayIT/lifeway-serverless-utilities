module.exports = {
  roots: ['<rootDir>/test'],
  setupFilesAfterEnv: ['jest-extended'],
  testMatch: ['**/?(*.)+(spec|test).+(ts|js)'],
  transform: {
    '^.+\\.(ts)$': 'ts-jest'
  },
};
