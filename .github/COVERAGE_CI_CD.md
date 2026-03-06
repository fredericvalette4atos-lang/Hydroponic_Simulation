# Coverage CI/CD Integration

## Overview

This document describes the CI/CD integration for 100% code coverage enforcement in the Hydroponic Test Simulation project.

## GitHub Actions Workflow

### Coverage Workflow (`coverage.yml`)

The GitHub Actions workflow automatically runs on:
- **Push** to `main` and `develop` branches
- **Pull Requests** to `main` and `develop` branches

#### Workflow Steps

1. **Checkout Code**: Retrieves the latest code from the repository
2. **Setup Node.js**: Configures Node.js 18.x environment
3. **Install Dependencies**: Runs `npm ci` for clean dependency installation
4. **Run Tests with Coverage**: Executes `npm run test:coverage` to generate coverage reports
5. **Check Coverage Thresholds**: Validates that all metrics meet 100% threshold
6. **Upload to Codecov**: Sends coverage data to Codecov for tracking and badge generation
7. **Generate Coverage Badge**: Creates a coverage badge for the README
8. **Comment on PR**: Posts coverage report as a comment on pull requests

### Coverage Thresholds

All metrics must meet **100%** coverage:

| Metric | Threshold |
|--------|-----------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

## Configuration Files

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

```json
{
  "coverage": {
    "minimum": 100,
    "thresholds": {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100
    },
    "failOnDecrease": true,
    "requireNewCodeCoverage": true
  },
  "codecov": {
    "enabled": true,
    "failOnError": true,
    "requireCoverage": true,
    "minimumCoverage": 100
  }
}
```

## Local Coverage Validation

### Run Tests with Coverage

```bash
npm run test:coverage
```

This generates:
- Console output with coverage summary
- HTML report in `coverage/lcov-report/index.html`
- LCOV format in `coverage/lcov.info`
- JSON summary in `coverage/coverage-summary.json`

### Validate Coverage Thresholds

```bash
npm run test:coverage:validate
```

This script:
1. Runs all tests with coverage
2. Validates that all metrics meet 100% threshold
3. Fails with exit code 1 if thresholds not met
4. Displays detailed report of any failures

### View HTML Coverage Report

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

## CI/CD Failure Scenarios

### Coverage Below 100%

**Trigger**: Any metric falls below 100%

**Action**: 
- CI/CD pipeline fails
- Pull request cannot be merged
- Codecov integration reports failure

**Resolution**:
1. Identify uncovered code paths from coverage report
2. Add tests to cover the missing paths
3. Run `npm run test:coverage:validate` locally to verify
4. Push changes to update PR

### Coverage Decrease

**Trigger**: Coverage decreases compared to previous commit

**Action**:
- CI/CD pipeline fails
- Pull request cannot be merged

**Resolution**:
1. Review changes that caused coverage decrease
2. Add tests for new code paths
3. Ensure all new code is covered

### Codecov Upload Failure

**Trigger**: Codecov service is unavailable or upload fails

**Action**:
- CI/CD pipeline fails (fail_ci_if_error: true)
- Pull request cannot be merged

**Resolution**:
1. Check Codecov service status
2. Verify CODECOV_TOKEN is set (if required)
3. Retry the workflow

## Codecov Integration

### Codecov Configuration

The workflow uploads coverage to Codecov with:
- **Files**: `./coverage/lcov.info`
- **Flags**: `unittests`
- **Fail on Error**: `true`
- **Verbose**: `true`

### Codecov Features

- **Coverage Tracking**: Historical coverage trends
- **Coverage Badges**: Display coverage percentage in README
- **Pull Request Comments**: Automatic coverage reports on PRs
- **Coverage Comparison**: Compare coverage between commits

### Codecov Badge

Add to README.md:

```markdown
[![codecov](https://codecov.io/gh/[owner]/[repo]/branch/main/graph/badge.svg)](https://codecov.io/gh/[owner]/[repo])
```

## Coverage Badge

### Local Badge Generation

The workflow generates a coverage badge using shields.io:

```
https://img.shields.io/badge/coverage-100%25-brightgreen
```

### Add Badge to README

```markdown
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
```

## Pull Request Integration

### Automatic Coverage Report

When a pull request is created or updated:

1. Coverage workflow runs automatically
2. Coverage report is posted as a comment
3. Report includes:
   - Coverage percentages for all metrics
   - Pass/fail status
   - Comparison to main branch (if available)

### PR Merge Requirements

Pull requests cannot be merged if:
- Coverage is below 100%
- Coverage has decreased
- Codecov upload fails

## Troubleshooting

### Coverage Report Not Generated

**Problem**: `coverage/coverage-summary.json` not found

**Solution**:
1. Ensure tests are running: `npm test`
2. Check jest.config.js has `collectCoverageFrom` configured
3. Verify coverage directory is created: `ls -la coverage/`

### Coverage Validation Script Fails

**Problem**: `scripts/validate-coverage.js` exits with error

**Solution**:
1. Run `npm run test:coverage` to generate reports
2. Check coverage metrics: `cat coverage/coverage-summary.json`
3. Identify uncovered code paths
4. Add tests for missing coverage

### Codecov Upload Fails

**Problem**: Codecov integration fails in CI/CD

**Solution**:
1. Check Codecov service status
2. Verify repository is connected to Codecov
3. Check for CODECOV_TOKEN if required
4. Review Codecov logs for specific errors

### PR Comment Not Posted

**Problem**: Coverage report comment not appearing on PR

**Solution**:
1. Verify GitHub Actions has permission to comment
2. Check workflow logs for errors
3. Ensure `github.event_name == 'pull_request'` condition is met
4. Verify `GITHUB_TOKEN` has `pull-requests: write` permission

## Best Practices

### Maintaining 100% Coverage

1. **Write Tests First**: Use TDD approach
2. **Test Edge Cases**: Cover boundary conditions
3. **Test Error Paths**: Include error handling tests
4. **Use Property-Based Tests**: Validate invariants
5. **Review Coverage Reports**: Identify uncovered paths

### CI/CD Best Practices

1. **Run Locally First**: Validate coverage before pushing
2. **Keep Tests Fast**: Aim for <30s execution time
3. **Monitor Trends**: Track coverage over time
4. **Document Exclusions**: Justify any coverage exclusions
5. **Automate Validation**: Use CI/CD to enforce standards

## Related Files

- `.github/workflows/coverage.yml` - GitHub Actions workflow
- `.github/coverage-config.json` - Coverage configuration
- `jest.config.js` - Jest configuration with coverage thresholds
- `scripts/validate-coverage.js` - Coverage validation script
- `package.json` - NPM scripts for coverage

## References

- [Jest Coverage Documentation](https://jestjs.io/docs/coverage)
- [Codecov Documentation](https://docs.codecov.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Shields.io Badge Documentation](https://shields.io/)
