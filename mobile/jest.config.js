// Scoped to pure-logic unit tests only (lib/*.js) — screen/component tests would need
// the full jest-expo preset plus mocks for every native module (camera, notifications,
// secure-store, etc.), which is a much bigger lift for comparatively little bug-catching
// value here. This covers validation rules, date formatting, and filtering — where the
// actual logic bugs live.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/lib/__tests__/**/*.test.js'],
};
