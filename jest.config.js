/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // tsconfig "paths" ile aynı: `@/src/...` -> proje kökü.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/', '/android/', '/ios/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**', '!src/**/*.d.ts'],
  coverageReporters: ['text-summary', 'lcov'],
  // RNTL 14'te render/fireEvent async: soğuk önbellekte (CI) ilk render/press sırasındaki
  // babel dönüşümü artık test süresine sayılıyor (SDK 54'te de 3-7 sn sürüyordu). 5 sn dar.
  testTimeout: 15_000,
  clearMocks: true,
  restoreMocks: true,
};
