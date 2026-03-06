/**
 * Basic setup test to verify Jest configuration
 */

describe('Project Setup', () => {
  test('Jest is configured correctly', () => {
    expect(true).toBe(true);
  });

  test('TypeScript compilation works', () => {
    const value: number = 42;
    expect(value).toBe(42);
  });
});
