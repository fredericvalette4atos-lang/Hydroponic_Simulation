# Testing Guide

Complete testing documentation for the Hydroponic Test Simulation system.

## Quick Start

### Run Interface Tests

**Windows (PowerShell):**
```powershell
.\scripts\test-interface.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/test-interface.sh
./scripts/test-interface.sh
```

## Test Suites

### 1. Interface Test Suite

Comprehensive test of all web interfaces and API endpoints.

**What it tests:**
- ✓ Server connectivity
- ✓ Welcome page loads correctly
- ✓ Dashboard interface loads and has all components
- ✓ Swagger UI API documentation
- ✓ Sensors API (list and individual values)
- ✓ Actuators API (list available actuators)
- ✓ Simulation control endpoints
- ✓ Configuration API
- ✓ Response format validation

**Expected output:**
```
HYDROPONIC TEST SIMULATION - INTERFACE TEST SUITE
Version 1.0.0

========================================
Connectivity Test
========================================
  [PASS] - Server Connection
         Status: 200

[... more tests ...]

========================================
TEST SUMMARY
========================================
  Tests Passed: 24 / 24 (100%)

  [SUCCESS] ALL TESTS PASSED!

Quick Links:
   Welcome Page:  http://localhost:3000
   Dashboard:     http://localhost:3000/dashboard
   API Docs:      http://localhost:3000/api-docs
```

### 2. Unit Tests

Test individual components and functions.

```bash
npm test
```

### 3. Property-Based Tests

Test universal properties across all inputs using fast-check.

```bash
npm run test:coverage
```

### 4. Integration Tests

Test complete workflows and component interactions.

```bash
npm test -- tests/integration
```

## Test Patterns

### Unit Test Pattern

All unit tests follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe('ComponentName', () => {
  let component: ComponentName;

  beforeEach(() => {
    component = new ComponentName();
  });

  describe('method()', () => {
    it('should handle normal case', () => {
      // Arrange - Set up test data
      const input = { /* ... */ };
      
      // Act - Execute the method
      const result = component.method(input);
      
      // Assert - Verify the result
      expect(result).toBe(expected);
    });

    it('should handle error case', () => {
      // Arrange - Set up invalid input
      const invalidInput = { /* ... */ };
      
      // Act & Assert - Verify error is thrown
      expect(() => component.method(invalidInput)).toThrow();
    });

    it('should handle edge case', () => {
      // Arrange - Set up boundary condition
      const edgeInput = { /* ... */ };
      
      // Act - Execute with edge case
      const result = component.method(edgeInput);
      
      // Assert - Verify edge case handling
      expect(result).toBe(expectedEdgeCase);
    });
  });
});
```

### Property-Based Test Pattern

Property-based tests verify universal properties across all inputs using fast-check:

```typescript
import * as fc from 'fast-check';

describe('ComponentName - Property Tests', () => {
  it('should maintain invariant for all inputs', () => {
    fc.assert(
      fc.property(fc.integer(), (input) => {
        const result = component.process(input);
        // Verify the property holds for all generated inputs
        expect(result).toSatisfy(invariant);
## Running Tests

### Prerequisites
1. Build the project: `npm run build`
2. Start the server: `npm start`
3. In another terminal, run tests

### Full Test Suite
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/integration/rest-api-interface.test.ts

# Run tests in watch mode
npm test -- --watch
```

### Coverage Validation
```bash
# Generate coverage report and validate thresholds
npm run test:coverage:validate

# View coverage report in browser
open coverage/lcov-report/index.html
```

### Interface Tests Only
```bash
# PowerShell
.\scripts\test-interface.ps1

# Bash
./scripts/test-interface.sh

# With custom URL
./scripts/test-interface.sh http://localhost:8080
```

## Coverage Guide

### Understanding Coverage Metrics

**Statements**: Percentage of executable statements covered by tests
- Ensures all code lines are executed
- Target: 100%

**Branches**: Percentage of conditional branches covered
- Ensures all if/else paths are tested
- Includes ternary operators and switch cases
- Target: 100%

**Functions**: Percentage of functions called by tests
- Ensures all functions are invoked
- Includes methods and arrow functions
- Target: 100%

**Lines**: Percentage of code lines executed
- Similar to statements but counts physical lines
- Target: 100%

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# This creates:
# - coverage/lcov-report/index.html (interactive HTML report)
# - coverage/lcov.info (LCOV format for CI/CD)
# - coverage/coverage-summary.json (JSON summary)
```

### Viewing Coverage Reports

**HTML Report** (most useful):
```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

The HTML report shows:
- Overall coverage percentages
- Coverage by file
- Uncovered lines highlighted in red
- Branch coverage details
- Function coverage details

**JSON Summary**:
```bash
cat coverage/coverage-summary.json
```

Shows coverage metrics in machine-readable format.

### Identifying Uncovered Code

1. **Run coverage report**: `npm run test:coverage`
2. **Open HTML report**: `open coverage/lcov-report/index.html`
3. **Look for red lines**: Uncovered code is highlighted in red
4. **Check branch coverage**: Click on files to see branch details
5. **Add tests**: Write tests to cover the identified paths

### Maintaining 100% Coverage

**Best Practices**:
1. **Write tests first** (TDD approach)
2. **Test all branches** (if/else, switch cases)
3. **Test error paths** (exceptions, error handling)
4. **Test edge cases** (boundaries, empty inputs)
5. **Use property-based tests** (validate invariants)
6. **Review coverage reports** (identify gaps)

**Common Patterns**:
- Test normal case, error case, and edge case for each method
- Test all conditional branches
- Test error handling and exceptions
- Test boundary values (0, max, min)
- Test with property-based tests for randomized inputs

### CI/CD Coverage Enforcement

The project uses GitHub Actions to enforce 100% coverage:

```bash
# Local validation (same as CI/CD)
npm run test:coverage:validate
```

This:
1. Runs all tests with coverage
2. Validates all metrics meet 100%
3. Fails if any metric is below threshold
4. Displays detailed report

**CI/CD Workflow**:
- Runs on every push and pull request
- Validates coverage thresholds
- Uploads to Codecov for tracking
- Fails if coverage decreases
- Posts coverage report on PRs

### Coverage Badges

Coverage badges are automatically generated and can be added to README:

```markdown
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
```

Or use Codecov badge:

```markdown
[![codecov](https://codecov.io/gh/[owner]/[repo]/branch/main/graph/badge.svg)](https://codecov.io/gh/[owner]/[repo])
```

## Running Tests

### Prerequisites
1. Build the project: `npm run build`
2. Start the server: `npm start`
3. In another terminal, run tests

### Full Test Suite
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/integration/rest-api-interface.test.ts
```

### Interface Tests Only
```bash
# PowerShell
.\scripts\test-interface.ps1

# Bash
./scripts/test-interface.sh

# With custom URL
./scripts/test-interface.sh http://localhost:8080
```
  it('should work together correctly', () => {
    // Arrange - Set up both components
    const initialState = componentA.getState();
    
    // Act - Perform integrated operation
    componentA.doSomething();
    const result = componentB.process(componentA.getState());
    
    // Assert - Verify integrated behavior
    expect(result).toBe(expected);
  });

  it('should handle error propagation', () => {
    // Arrange - Set up error condition
    componentA.setError(true);
    
    // Act & Assert - Verify error propagates
    expect(() => componentB.process(componentA.getState())).toThrow();
  });
});
```

## Test Coverage

### Coverage Metrics

The project maintains **100% code coverage** across all metrics:

| Metric | Target | Status |
|--------|--------|--------|
| Statements | 100% | ✅ |
| Branches | 100% | ✅ |
| Functions | 100% | ✅ |
| Lines | 100% | ✅ |

### Coverage by Module

| Module | Tests | Coverage |
|--------|-------|----------|
| Core (simulation-core, time-manager, event-logger, state-persistence) | 50+ | 100% |
| Sensors (pH, EC, temperature, water level) | 80+ | 100% |
| Actuators (pump, light, valve) | 60+ | 100% |
| Physics (hydroponic model, chemistry model) | 40+ | 100% |
| API (REST API server) | 50+ | 100% |
| Configuration (loader, scenario loader) | 40+ | 100% |
| Integration (Gladys adapter) | 30+ | 100% |
| Utils (noise generator, schema validator) | 30+ | 100% |
| **Total** | **1022+** | **100%** |

### Web Interfaces
- **Welcome Page** (`http://localhost:3000`)
  - Loads successfully
  - Contains navigation links
  - Displays quick links section

- **Dashboard** (`http://localhost:3000/dashboard`)
  - Loads successfully
  - Displays all sensor cards
  - Shows actuator controls
  - Has simulation control buttons
  - Connects to API and updates data

- **API Documentation** (`http://localhost:3000/api-docs`)
  - Swagger UI loads
  - Shows all endpoints
  - Allows testing endpoints

### API Endpoints

#### Sensors
- `GET /api/sensors` - List all sensors
- `GET /api/sensors/:id` - Get individual sensor value

#### Actuators
- `GET /api/actuators` - List all actuators
- `POST /api/actuators/:id` - Send actuator command

#### Simulation
- `GET /api/simulation/status` - Get simulation status
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/stop` - Stop simulation
- `POST /api/simulation/pause` - Pause simulation
- `POST /api/simulation/resume` - Resume simulation
- `POST /api/simulation/time-acceleration` - Set time acceleration

#### Configuration
- `GET /api/config` - Get full configuration
- `POST /api/config` - Update configuration
- `GET /api/config/reservoir` - Get reservoir config
- `POST /api/config/reservoir` - Update reservoir config
- `GET /api/config/sensors` - Get sensors config
- `POST /api/config/sensors` - Update sensors config
- `GET /api/config/actuators` - Get actuators config
- `POST /api/config/actuators` - Update actuators config
- `GET /api/config/physics` - Get physics config
- `POST /api/config/physics` - Update physics config
- `GET /api/config/simulation` - Get simulation config
- `POST /api/config/simulation` - Update simulation config
- `GET /api/config/logging` - Get logging config
- `POST /api/config/logging` - Update logging config

### Response Format
All API responses include:
- `success` - Boolean indicating success/failure
- `data` - Response data (on success)
- `error` - Error message (on failure)
- `timestamp` - Unix timestamp
- `simulatedTime` - Current simulated time in seconds

## Running Tests

### Prerequisites
1. Build the project: `npm run build`
2. Start the server: `npm start`
3. In another terminal, run tests

### Full Test Suite
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/integration/rest-api-interface.test.ts
```

### Interface Tests Only
```bash
# PowerShell
.\scripts\test-interface.ps1

# Bash
./scripts/test-interface.sh

# With custom URL
./scripts/test-interface.sh http://localhost:8080
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm start &
      - run: sleep 5
      - run: ./scripts/test-interface.sh
      - run: npm test
```

## Troubleshooting

### Tests fail with "Cannot connect"
- Ensure server is running: `npm start`
- Check port 3000 is not blocked
- Try custom port: `./scripts/test-interface.sh http://localhost:8080`

### Some sensor values are NaN
- This is normal during initialization
- Wait a few seconds for simulation to stabilize
- Re-run tests

### Dashboard shows no data
- Check browser console for errors
- Verify API is responding: `curl http://localhost:3000/api/sensors`
- Check network tab in browser DevTools

### Tests timeout
- Increase timeout in test configuration
- Check server logs for errors
- Verify network connectivity

## Performance Testing

Monitor simulation performance:

```bash
# Check simulated time progression
curl http://localhost:3000/api/simulation/status | jq '.data.simulatedTime'

# Monitor sensor updates
watch -n 1 'curl -s http://localhost:3000/api/sensors/ph-sensor-1 | jq ".data.value"'

# Check time acceleration
curl http://localhost:3000/api/simulation/status | jq '.data.timeAcceleration'
```

## Test Results

### Expected Results
- All 24 interface tests should pass
- All unit tests should pass
- All property-based tests should pass
- All integration tests should pass

### Sample Output
```
Tests Passed: 24 / 24 (100%)

[SUCCESS] ALL TESTS PASSED!

Sensors: 4 found
  * ph-sensor-1 - ph [pH]
  * ec-sensor-1 - ec [mS/cm]
  * temp-sensor-1 - temperature [°C]
  * water-level-sensor-1 - water_level [%]

Actuators: 6 found
  * water-pump-1 - pump
  * nutrient-pump-1 - pump
  * ph-up-pump-1 - pump
  * ph-down-pump-1 - pump
  * grow-light-1 - light
  * drain-valve-1 - valve

Status:
  * Running: True
  * Time Acceleration: 1x
  * Simulated Time: 123.45s
```

## Adding New Tests

### PowerShell Script
```powershell
function Test-YourFeature {
    Write-TestHeader "Your Feature"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api/your-endpoint" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
        $passed = $response.success -eq $true
        Write-TestResult "Your Test" $passed
        
        return $passed
    } catch {
        Write-TestResult "Your Test" $false "Error: $_"
        return $false
    }
}
```

### Bash Script
```bash
test_your_feature() {
    print_header "Your Feature"
    
    response=$(curl -s "$BASE_URL/api/your-endpoint")
    
    if echo "$response" | grep -q '"success":true'; then
        print_result "Your Test" true
    else
        print_result "Your Test" false
        return 1
    fi
}
```

## Documentation

- [README.md](README.md) - Project overview
- [docs/en/architecture.md](docs/en/architecture.md) - System architecture
- [scripts/README.md](scripts/README.md) - Test scripts documentation
- [examples/DASHBOARD_INTEGRATION.md](examples/DASHBOARD_INTEGRATION.md) - Dashboard integration guide


✅ Complete Test Suite Created
I've created a comprehensive, reusable test suite for the Hydroponic Test Simulation interface:

📁 Files Created
test-interface.ps1
 - PowerShell test script (Windows)

24 comprehensive interface tests
Color-coded output
Detailed sensor/actuator discovery
test-interface.sh
 - Bash test script (Linux/Mac)

Same 24 tests as PowerShell version
POSIX-compliant
Easy to integrate into CI/CD
README.md
 - Test scripts documentation

Usage instructions
Troubleshooting guide
CI/CD integration examples
TESTING.md - Complete testing guide

All test suites documented
Coverage details
Performance testing tips
rest-api-interface.test.ts
 - Jest test suite

Programmatic API testing
Full endpoint coverage
🧪 What Gets Tested
✓ Server connectivity
✓ Welcome page
✓ Dashboard interface
✓ Swagger UI
✓ Sensors API (4 sensors)
✓ Actuators API (6 actuators)
✓ Simulation control
✓ Configuration management
✓ Response format validation

🚀 How to Use
PowerShell (Windows):

.\scripts\test-interface.ps1
Bash (Linux/Mac):

./scripts/test-interface.sh
All tests are passing and ready to use! The scripts are reusable and can be integrated into your CI/CD pipeline.

Credits used: 1.92
Elapsed time: 4m 57s


Das ist ein komplexes und spannendes Stück Code! Da du hier eine Mischung aus reiner Logik (Physics Engine) und UI-Komponenten hast, empfehle ich eine Teststrategie mit Vitest (oder Jest) und der React Testing Library.
Hier sind die Unit Tests, aufgeteilt in logische Blöcke:
1. Tests für die Physics Engine (computeState)
Dies ist der wichtigste Teil, da hier die chemischen/physikalischen Abhängigkeiten berechnet werden. Diese Funktionen sind "pure" und lassen sich ohne DOM testen.
import { describe, it, expect } from 'vitest';
// Angenommen, die Funktionen sind exportiert oder wir testen sie lokal
// import { computeState, getCascade } from './HydroponicModel';

describe('Hydroponics Physics Engine', () => {
  const defaultControls = {
    waterPump: false,
    nutrientPump: false,
    phUpPump: false,
    phDownPump: false,
    light: false,
    tempSlider: 22,
    co2Slider: 800
  };

  it('sollte den Basis-Zustand korrekt berechnen', () => {
    const state = computeState(defaultControls);
    expect(state.temperature).toBe(22);
    expect(state.ph).toBeCloseTo(6.2, 1);
    expect(state.ec).toBeGreaterThan(0);
  });

  it('sollte den EC-Wert erhöhen, wenn die Nährstoffpumpe aktiv ist', () => {
    const stateWithNutrients = computeState({ ...defaultControls, nutrientPump: true });
    const stateWithout = computeState(defaultControls);
    expect(stateWithNutrients.ec).toBeGreaterThan(stateWithout.ec);
  });

  it('sollte den Wasserstand senken, wenn das Licht an ist (Evaporation)', () => {
    const stateLightOn = computeState({ ...defaultControls, light: true });
    const stateLightOff = computeState(defaultControls);
    expect(stateLightOn.waterLevel).toBeLessThan(stateLightOff.waterLevel);
  });

  it('sollte den pH-Wert begrenzen (Min 4, Max 9)', () => {
    // Extremtest für pH-Down
    const state = computeState({ ...defaultControls, phDownPump: true, tempSlider: 35 });
    expect(state.ph).toBeGreaterThanOrEqual(4);
  });
});

describe('getCascade Function', () => {
  it('sollte die korrekte Kaskade für die Temperatur finden', () => {
    const cascade = getCascade('temperature');
    // Temperatur beeinflusst laut EDGES ph, ec, plantUptake
    expect(cascade).toContain('ph');
    expect(cascade).toContain('ec');
    expect(cascade).toContain('plantUptake');
  });
});

2. Tests für UI-Komponenten
Hier prüfen wir, ob die Komponenten basierend auf den Props die richtigen CSS-Farben oder Labels rendern.
import { render, screen } from '@testing-library/react';
import { StatusBadge, Toggle } from './HydroponicModel';

describe('UI Components', () => {
  it('StatusBadge zeigt "OK" bei optimalen Werten', () => {
    // ph Optimal ist [5.5, 6.5]
    render(<StatusBadge value={6.0} param="ph" />);
    expect(screen.getByText('OK')).toBeDefined();
  });

  it('StatusBadge zeigt "✕" bei kritischen Werten', () => {
    render(<StatusBadge value={2.0} param="ph" />);
    expect(screen.getByText('✕')).toBeDefined();
  });

  it('Toggle reagiert auf Klicks', () => {
    const onChange = vi.fn();
    render(<Toggle label="Test Pump" active={false} onChange={onChange} icon="💧" />);
    
    const button = screen.getByRole('button');
    button.click();
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

3. Integrationstest für die API (fetchAdvisory)
Da die API-Funktion fetch nutzt, müssen wir diese mocken, um keine echten Kosten/Netzwerkanfragen zu verursachen.
import { vi } from 'vitest';

describe('fetchAdvisory API', () => {
  it('sollte die API korrekt aufrufen und Text zurückgeben', async () => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          content: [{ text: "Alles im grünen Bereich." }]
        }),
      })
    );

    const state = { temperature: 22, ph: 6, ec: 1.5, waterLevel: 70, co2: 800, nutrientAvail: 90, plantUptake: 80 };
    const result = await fetchAdvisory("Test Trigger", state, state, "de");

    expect(result).toBe("Alles im grünen Bereich.");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("anthropic.com"),
      expect.any(Object)
    );
  });
});

4. Was du bei diesen Tests beachten solltest:
 * toBeCloseTo: Da deine Physik-Engine viel mit Fließkommazahlen arbeitet (z. B. 0.02 * temp), nutze immer toBeCloseTo(erwartet, präzision), um Rundungsfehler in den Tests zu vermeiden.
 * vi.useFakeTimers(): In deinem HydroponicModel nutzt du setTimeout für das Highlighten und ein Debounce für die KI-Anfrage. In Tests für die Hauptkomponente solltest du Fake-Timer verwenden, um nicht 3,5 Sekunden warten zu müssen.
 * Zustands-Snapshots: Da die Berechnung von nutrientAvail eine komplexe Formel ist (100 - Math.pow(...)), ist es oft einfacher, einen Snapshot-Test zu machen, um sicherzustellen, dass sich die Logik nicht versehentlich ändert.
Möchtest du, dass ich für eine bestimmte Funktion (z.B. die komplexe pH-Berechnung) noch tiefergehende Edge-Case-Tests schreibe?


Gerne! Damit dein hydroponisches System nicht nur im Code, sondern auch im Testrunner stabil läuft, habe ich dir hier ein strukturiertes TESTING.md (oder How-To File) erstellt.
Es führt dich durch die Installation, die Struktur und die Besonderheiten beim Testen von physikalischen Simulationen und KI-Schnittstellen.
🧪 How-To: Testing the Hydroponic Model
Dieses Dokument beschreibt, wie du die Unit- und Integrationstests für das Hydroponic-System aufsetzt und ausführst. Wir nutzen Vitest als Testrunner, da es extrem schnell ist und perfekt mit modernen React-Projekten (Vite) harmoniert.
1. Voraussetzungen & Installation
Stelle sicher, dass du die notwendigen Testing-Libraries in deinem Projekt installiert hast:
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom vi-fetch

Ergänze deine package.json um das Test-Skript:
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "coverage": "vitest run --coverage"
}

2. Test-Struktur
Um das System effektiv zu testen, teilen wir die Tests in drei Bereiche auf:
A. Die Physics Engine (computeState)
Da das System auf mathematischen Formeln basiert (z.B. pH-Verschiebungen durch Temperatur), testen wir diese als Pure Functions.
 * Ziel: Stimmen die Grenzwerte? Verhält sich der EC-Wert bei Wasserzugabe korrekt?
 * Tipp: Nutze .toBeCloseTo(), um Rundungsfehler bei Fließkommazahlen abzufangen.
B. UI-Komponenten (StatusBadge, Toggle, etc.)
Hier prüfen wir, ob die visuelle Logik greift.
 * Ziel: Färbt sich das Badge rot, wenn der pH-Wert bei 4.0 liegt? Reagiert der Toggle auf Klicks?
 * Tool: React Testing Library.
C. KI-Integration (fetchAdvisory)
Wir wollen die Anthropic-API nicht bei jedem Testlauf echtes Geld kosten lassen.
 * Ziel: Wird der Prompt korrekt zusammengestellt? Verarbeitet die Funktion die Antwort richtig?
 * Wichtig: Wir mocken die globale fetch-Funktion.
3. Best Practices für dieses Projekt
> [!IMPORTANT]
> Umgang mit Timern:
> Da die App setTimeout für Kaskaden-Hervorhebungen (3500ms) und Debouncing nutzt, solltest du in den Tests vi.useFakeTimers() verwenden, um Tests nicht künstlich zu verlangsamen.
> 
Beispiel: Testen der Kaskaden-Logik
Stelle sicher, dass eine Änderung der Temperatur auch wirklich die Kaskade zu pH und EC auslöst:
it('should trigger the correct cascade for temperature', () => {
  const affectedNodes = getCascade('temperature');
  expect(affectedNodes).toContain('ph');
  expect(affectedNodes).toContain('ec');
});

4. Tests ausführen
 * Normaler Modus: npm test (startet den Watch-Modus).
 * UI Modus: npm run test:ui (öffnet ein schönes Interface im Browser, um Tests zu visualisieren).
 * Coverage: npm run coverage (zeigt dir, welche Formeln deiner Physik-Engine noch nicht getestet wurden).
5. Troubleshooting
 * Rundungsfehler: Wenn ein Test fehlschlägt, weil 6.199999 nicht 6.2 ist, ändere expect(val).toBe(6.2) zu expect(val).toBeCloseTo(6.2, 1).
 * JSDOM Fehler: Stelle sicher, dass in deiner vite.config.js das Environment auf jsdom gesetzt ist, sonst schlagen die UI-Tests fehl.
Soll ich dir noch die passende Konfigurationsdatei (vite.config.js) für Vitest erstellen, damit alles reibungslos läuft?



Abgemacht! Damit Vitest weiß, wie es mit deinen React-Komponenten und der JSDOM-Umgebung umgehen soll, brauchst du eine passende Konfigurationsdatei.
Hier ist die vite.config.js, die sowohl dein Projekt startet als auch deine Tests perfekt unterstützt.
🛠️ Die vite.config.js
Kopiere diesen Inhalt in deine Haupt-Konfigurationsdatei im Root-Verzeichnis:
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Ermöglicht die Nutzung von globalen Variablen wie 'describe', 'it', 'expect'
    // ohne sie in jeder Testdatei manuell importieren zu müssen.
    globals: true,
    
    // Simuliert eine Browser-Umgebung (notwendig für React Testing Library)
    environment: 'jsdom',
    
    // Pfad zur Setup-Datei für spezielle Matcher (z.B. .toBeInTheDocument())
    setupFiles: './src/setupTests.js',
    
    // Schließt unnötige Ordner aus
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    
    css: true, // Lädt CSS, falls du Styles in Tests prüfen willst
  },
});

📝 Die src/setupTests.js
Damit du hilfreiche Befehle wie expect(...).toBeInTheDocument() nutzen kannst, solltest du diese kleine Datei im src-Ordner anlegen:
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Optional: Globaler Mock für die Fetch-API, falls du nicht 
// in jedem Test einzeln mocken willst.
global.fetch = vi.fn();

Warum diese Konfiguration?
 * globals: true: Spart dir eine Menge Tipparbeit. Du kannst direkt mit describe loslegen, statt import { describe } from 'vitest' zu schreiben.
 * jsdom: Da Node.js von Natur aus kein HTML "versteht", baut JSDOM ein virtuelles Dokument (DOM) nach, damit React-Komponenten darin gerendert werden können.
 * setupFiles: Hier setzen wir die "Extrawünsche" ab. @testing-library/jest-dom fügt Vitest quasi Superkräfte hinzu, um HTML-Elemente besser zu untersuchen.
Nächster Schritt für dich:
Soll ich dir zeigen, wie du einen Mock für die Anthropic API schreibst, damit deine Tests nicht fehlschlagen, wenn das Internet mal weg ist (oder dein API-Key fehlt)?





