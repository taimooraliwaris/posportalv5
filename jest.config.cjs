// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpe?g|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  roots: ['<rootDir>/src'],
};
