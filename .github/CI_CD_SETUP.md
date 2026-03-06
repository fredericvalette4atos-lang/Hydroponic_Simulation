# CI/CD Setup for 100% Code Coverage

## Quick Start

### Local Development

1. **Run tests with coverage**:
   ```bash
   npm run test:coverage
   ```

2. **Validate coverage thresholds**:
   ```bash
   npm run test:coverage:validate
   ```

3. **View coverage report**:
   ```bash
   # macOS
   open coverage/lcov-report/index.html
   
   # Linux
   xdg-open coverage/lcov-report/index.html
   
   # Windows
   start coverage/lcov-report/index.html
   ```

## GitHub Actions Workflow

### Automatic Checks

The workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### Workflow Features

✅ **Coverage Validation**
- Enforces 100% coverage threshold
- Fails if any metric drops below 100%
- Validates: statements, branches, functions, lines

✅ **Codecov Integration**
- Uploads coverage reports to Codecov
- Generates coverage badges
- Tracks coverage trends over time

✅ **Pull Request Integration**
- Posts coverage report as PR comment
- Shows coverage metrics for all changes
- Prevents merge if coverage is insufficient

✅ **Failure Detection**
- Fails CI if coverage decreases
- Fails CI if thresholds not met
- Fails CI if Codecov upload fails

## Configuration

### Jest Configuration (`jest.config.js`)

```javascript
coverageThreshold: {
  global: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100
  }
}
```

### Coverage Configuration (`.github/coverage-config.json`)

Defines:
- Minimum coverage: 100%
- Fail on decrease: true
- Require new code coverage: true
- Codecov integration: enabled

### GitHub Actions Workflow (`.github/workflows/coverage.yml`)

Defines:
- Trigger events (push, pull_request)
- Node.js version (18.x)
- Test execution
- Coverage validation
- Codecov upload
- PR comments

## Coverage Requirements

### Minimum Thresholds

| Metric | Threshold |
|--------|-----------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

### New Code Coverage

- All new code must be covered
- Coverage cannot decrease
- All tests must pass

## Troubleshooting

### Coverage Below 100%

**Problem**: CI fails with coverage below 100%

**Solution**:
1. Run `npm run test:coverage` locally
2. Open `coverage/lcov-report/index.html`
3. Identify uncovered lines
4. Add tests for uncovered code
5. Verify with `npm run test:coverage:validate`

### Codecov Upload Fails

**Problem**: Codecov integration fails

**Solution**:
1. Check Codecov service status
2. Verify repository is connected to Codecov
3. Check GitHub Actions logs for errors
4. Retry the workflow

### PR Comment Not Posted

**Problem**: Coverage report not appearing on PR

**Solution**:
1. Verify GitHub Actions has write permissions
2. Check workflow logs for errors
3. Ensure PR is from same repository (not fork)

## Best Practices

### Writing Tests

1. **Test all code paths**: Use coverage reports to identify gaps
2. **Test edge cases**: Boundary values, error conditions
3. **Test error handling**: Exception paths, error recovery
4. **Use property-based tests**: Validate invariants across inputs

### Maintaining Coverage

1. **Run tests locally**: Before pushing changes
2. **Review coverage reports**: Identify uncovered paths
3. **Add tests incrementally**: As you write new code
4. **Monitor trends**: Track coverage over time

### CI/CD Best Practices

1. **Keep tests fast**: Aim for <30s execution time
2. **Parallelize tests**: Use Jest workers
3. **Cache dependencies**: Use npm cache in CI
4. **Monitor failures**: Review CI logs regularly

## Files

- `.github/workflows/coverage.yml` - GitHub Actions workflow
- `.github/coverage-config.json` - Coverage configuration
- `.github/COVERAGE_CI_CD.md` - Detailed documentation
- `jest.config.js` - Jest configuration
- `scripts/validate-coverage.js` - Coverage validation script
- `package.json` - NPM scripts

## Next Steps

1. **Set up Codecov** (optional):
   - Visit https://codecov.io
   - Connect your GitHub repository
   - Get Codecov token if needed

2. **Add coverage badge to README**:
   ```markdown
   [![codecov](https://codecov.io/gh/[owner]/[repo]/branch/main/graph/badge.svg)](https://codecov.io/gh/[owner]/[repo])
   ```

3. **Monitor coverage trends**:
   - Check Codecov dashboard regularly
   - Review PR coverage reports
   - Track coverage over time

## References

- [Jest Coverage Documentation](https://jestjs.io/docs/coverage)
- [Codecov Documentation](https://docs.codecov.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
