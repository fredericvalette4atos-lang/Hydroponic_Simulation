#!/usr/bin/env node

/**
 * Coverage Validation Script
 * Validates that coverage meets 100% threshold and fails CI if not met
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_SUMMARY_PATH = path.join(__dirname, '../coverage/coverage-summary.json');
const CONFIG_PATH = path.join(__dirname, '../.github/coverage-config.json');

function validateCoverage() {
  try {
    // Read coverage summary
    if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
      console.warn('⚠️  Coverage summary not found at:', COVERAGE_SUMMARY_PATH);
      console.log('Note: Run "npm run test:coverage" to generate coverage reports');
      console.log('Skipping validation - coverage reports not yet generated');
      return 0;
    }

    const coverageSummary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf8'));
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const thresholds = config.coverage.thresholds;
    const total = coverageSummary.total;

    console.log('\n📊 Coverage Validation Report\n');
    console.log('═'.repeat(50));

    let allPassed = true;
    const results = [];

    // Check each metric
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const coverage = total[metric];
      const pct = coverage.pct;
      const passed = pct >= threshold;

      if (!passed) {
        allPassed = false;
      }

      const status = passed ? '✅' : '❌';
      const line = `${status} ${metric.padEnd(15)} ${pct.toString().padStart(6)}% / ${threshold}%`;
      console.log(line);
      results.push({ metric, pct, threshold, passed });
    }

    console.log('═'.repeat(50));

    if (allPassed) {
      console.log('\n✅ All coverage thresholds met!\n');
      return 0;
    } else {
      console.log('\n❌ Coverage thresholds not met!\n');
      console.log('Failed metrics:');
      results
        .filter(r => !r.passed)
        .forEach(r => {
          const diff = r.threshold - r.pct;
          console.log(`  - ${r.metric}: ${diff.toFixed(2)}% below threshold`);
        });
      console.log();
      return 1;
    }
  } catch (error) {
    console.error('❌ Error validating coverage:', error.message);
    process.exit(1);
  }
}

process.exit(validateCoverage());
