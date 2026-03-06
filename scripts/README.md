# Test Scripts

Automated test scripts for the Hydroponic Test Simulation system.

## Available Scripts

### Interface Test Suite

Complete test suite that validates all web interfaces and API endpoints.

#### PowerShell (Windows)

```bash
.\scripts\test-interface.ps1
```

Or with custom base URL:

```bash
.\scripts\test-interface.ps1 -BaseUrl http://localhost:8080
```

#### Bash (Linux/Mac)

```bash
chmod +x scripts/test-interface.sh
./scripts/test-interface.sh
```

Or with custom base URL:

```bash
./scripts/test-interface.sh http://localhost:8080
```

## What Gets Tested

### 1. Connectivity
- Server is running and responding

### 2. Web Interfaces
- **Welcome Page** - Central hub with navigation
- **Dashboard** - Real-time monitoring interface
- **API Documentation** - Swagger UI

### 3. API Endpoints
- **Sensors API** - List and retrieve sensor values
- **Actuators API** - List available actuators
- **Simulation Control** - Status, pause, resume, time acceleration
- **Configuration API** - Get and update configuration

### 4. Response Format
- All responses include required fields
- Consistent JSON structure
- Proper error handling

## Test Output

The test suite provides:
- ✓ PASS/✗ FAIL indicators for each test
- Detailed information about discovered sensors and actuators
- Current simulation status
- Configuration details
- Quick links to access the interfaces

## Example Output

```
🌱 HYDROPONIC TEST SIMULATION - INTERFACE TEST SUITE
Version 1.0.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 Connectivity Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ PASS - Server Connection (Status: 200)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Welcome Page
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ PASS - Welcome Page Load (Status: 200)
  ✓ PASS - Page Title
  ✓ PASS - Navigation Links

...

📊 TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tests Passed: 24 / 24 (100%)

  ✅ ALL TESTS PASSED!

📍 Quick Links:
   🏠 Welcome Page:  http://localhost:3000
   📚 Dashboard:     http://localhost:3000/dashboard
   📚 API Docs:      http://localhost:3000/api-docs
```

## Prerequisites

- Simulation server must be running (`npm start`)
- curl or PowerShell (for making HTTP requests)
- Bash 4+ (for Linux/Mac script)

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Troubleshooting

### "Server is not running"
Start the simulation server first:
```bash
npm start
```

### "Cannot connect to http://localhost:3000"
Check if:
- Server is running on the correct port
- Port 3000 is not blocked by firewall
- Use custom URL if running on different port: `./scripts/test-interface.sh http://localhost:8080`

### Tests fail intermittently
- Ensure simulation has time to initialize
- Check server logs for errors
- Verify network connectivity

## Integration with CI/CD

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Test Interface
  run: |
    npm start &
    sleep 5
    ./scripts/test-interface.sh
```

## Adding New Tests

To add new tests to the suite:

1. **PowerShell**: Add a new function `Test-YourFeature` and call it in `Main`
2. **Bash**: Add a new function `test_your_feature` and call it in `main`

Both scripts follow the same pattern:
- Use `print_header` to display test section
- Use `print_result` to report individual test results
- Return 0 for success, 1 for failure
