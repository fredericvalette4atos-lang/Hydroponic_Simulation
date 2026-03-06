/**
 * Property-Based Tests for Event Logging
 * 
 * Tests universal properties of the event logging system including sensor change
 * logging, actuator command logging, error logging, log level filtering, and
 * log file rotation.
 * 
 * Feature: hydroponic-test-simulation
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { EventLogger } from '../../src/core/event-logger';
import { TimeManager } from '../../src/core/time-manager';
import { LogLevel, ActuatorState } from '../../src/types';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid log levels
 */
const arbLogLevel = fc.constantFrom(
  LogLevel.DEBUG,
  LogLevel.INFO,
  LogLevel.WARNING,
  LogLevel.ERROR
);

/**
 * Generate valid sensor IDs
 */
const arbSensorId = fc.oneof(
  fc.constant('ph-sensor-1'),
  fc.constant('ec-sensor-1'),
  fc.constant('temp-sensor-1'),
  fc.constant('water-level-sensor-1'),
  fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/) // Alphanumeric, underscore, hyphen only
);

/**
 * Generate valid actuator IDs
 */
const arbActuatorId = fc.oneof(
  fc.constant('pump-1'),
  fc.constant('light-1'),
  fc.constant('valve-1'),
  fc.string({ minLength: 1, maxLength: 20 })
);

/**
 * Generate valid sensor values
 */
const arbSensorValue = fc.float({ min: 0.0, max: Math.fround(100.0), noNaN: true });

/**
 * Generate valid actuator states
 */
const arbActuatorState: fc.Arbitrary<ActuatorState> = fc.record({
  active: fc.boolean(),
  intensity: fc.option(fc.float({ min: 0.0, max: Math.fround(100.0), noNaN: true }), { nil: undefined }),
  timestamp: fc.nat()
});

/**
 * Generate valid error messages
 */
const arbErrorMessage = fc.oneof(
  fc.constant('Actuator failure'),
  fc.constant('Sensor malfunction'),
  fc.constant('Configuration error'),
  fc.constant('Validation failed'),
  fc.string({ minLength: 1, maxLength: 100 })
);

/**
 * Generate valid log messages
 */
const arbLogMessage = fc.string({ minLength: 1, maxLength: 200 });

/**
 * Generate valid file sizes in bytes (for rotation testing)
 */
const arbFileSize = fc.integer({ min: 1024, max: 20 * 1024 * 1024 }); // 1KB to 20MB

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a temporary log file path for testing
 */
function createTempLogPath(): string {
  const tempDir = path.join(__dirname, '../temp-logs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}.log`);
}

/**
 * Clean up test log files
 */
function cleanupLogFiles(logPath: string): void {
  try {
    const dir = path.dirname(logPath);
    const base = path.basename(logPath, path.extname(logPath));
    
    // Remove all files matching the base name
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.startsWith(base) || file.startsWith('test-')) {
          const filePath = path.join(dir, file);
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Read log file contents
 */
function readLogFile(logPath: string): string {
  try {
    if (fs.existsSync(logPath)) {
      return fs.readFileSync(logPath, 'utf8');
    }
  } catch (error) {
    // Ignore read errors
  }
  return '';
}

/**
 * Count log entries in a log file
 */
function countLogEntries(logPath: string): number {
  const content = readLogFile(logPath);
  if (!content) return 0;
  return content.trim().split('\n').filter(line => line.length > 0).length;
}

/**
 * Get the active log file path (handles daily rotation naming)
 */
function getActiveLogPath(logger: EventLogger): string {
  const basePath = logger.getLogFilePath();
  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const base = path.basename(basePath, ext);
  
  // Check for daily rotation file
  const date = new Date().toISOString().split('T')[0];
  const dailyPath = path.join(dir, `${base}.${date}${ext}`);
  
  if (fs.existsSync(dailyPath)) {
    return dailyPath;
  }
  
  return basePath;
}

// ============================================================================
// Property 39: Sensor Change Logging
// **Validates: Requirements 13.1**
// ============================================================================

describe('Property 39: Sensor Change Logging', () => {
  test('sensor value changes are logged with all required fields', () => {
    fc.assert(
      fc.property(
        arbSensorId,
        arbSensorValue,
        arbSensorValue,
        (sensorId, oldValue, newValue) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          const logger = new EventLogger(
            {
              level: LogLevel.DEBUG,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 10
            },
            timeManager
          );

          // Log sensor change
          logger.logSensorChange(sensorId, oldValue, newValue);

          // Read log file
          const activePath = getActiveLogPath(logger);
          const logContent = readLogFile(activePath);

          // Cleanup
          cleanupLogFiles(logPath);

          // Verify log entry contains required fields
          expect(logContent).toContain('Sensor value changed');
          expect(logContent).toContain(sensorId);
          expect(logContent).toContain('oldValue');
          expect(logContent).toContain('newValue');
          expect(logContent).toContain('delta');
          
          // Verify timestamp and simulated time are present
          expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
          expect(logContent).toMatch(/\[SIM:\d+\.\d+s\]/); // Simulated time
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sensor changes are only logged at DEBUG level or lower', () => {
    fc.assert(
      fc.property(
        arbSensorId,
        arbSensorValue,
        arbSensorValue,
        fc.constantFrom(LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR),
        (sensorId, oldValue, newValue, logLevel) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          const logger = new EventLogger(
            {
              level: logLevel,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 10
            },
            timeManager
          );

          // Log sensor change (DEBUG level)
          logger.logSensorChange(sensorId, oldValue, newValue);

          // Read log file
          const activePath = getActiveLogPath(logger);
          const logContent = readLogFile(activePath);

          // Cleanup
          cleanupLogFiles(logPath);

          // Sensor changes should NOT be logged when level is above DEBUG
          expect(logContent).not.toContain('Sensor value changed');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 40: Actuator Command Logging
// **Validates: Requirements 13.2**
// ============================================================================

describe('Property 40: Actuator Command Logging', () => {
  test('actuator commands are logged with all required fields', () => {
    fc.assert(
      fc.property(
        arbActuatorId,
        arbActuatorState,
        (actuatorId, command) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          const logger = new EventLogger(
            {
              level: LogLevel.DEBUG,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 10
            },
            timeManager
          );

          // Log actuator command
          logger.logActuatorCommand(actuatorId, command);

          // Read log file
          const activePath = getActiveLogPath(logger);
          const logContent = readLogFile(activePath);

          // Cleanup
          cleanupLogFiles(logPath);

          // Verify log entry contains required fields
          expect(logContent).toContain('Actuator command received');
          expect(logContent).toContain('actuatorId');
          expect(logContent).toContain('command');
          
          // Verify timestamp and simulated time are present
          expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          expect(logContent).toMatch(/\[SIM:\d+\.\d+s\]/);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('actuator commands are logged at INFO level and above', () => {
    fc.assert(
      fc.property(
        arbActuatorId,
        arbActuatorState,
        fc.constantFrom(LogLevel.DEBUG, LogLevel.INFO),
        (actuatorId, command, logLevel) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          const logger = new EventLogger(
            {
              level: logLevel,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 10
            },
            timeManager
          );

          // Log actuator command (INFO level)
          logger.logActuatorCommand(actuatorId, command);

          // Read log file
          const activePath = getActiveLogPath(logger);
          const logContent = readLogFile(activePath);

          // Cleanup
          cleanupLogFiles(logPath);

          // Actuator commands should be logged at INFO level
          expect(logContent).toContain('Actuator command received');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 41: Error Logging
// **Validates: Requirements 13.3**
// ============================================================================

describe('Property 41: Error Logging', () => {
  test('errors are logged with message, stack trace, and context', () => {
    fc.assert(
      fc.property(
        arbErrorMessage,
        fc.record({
          componentId: fc.string({ minLength: 1, maxLength: 20 }),
          additionalInfo: fc.string({ minLength: 0, maxLength: 50 })
        }),
        (errorMessage, context) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          const logger = new EventLogger(
            {
              level: LogLevel.DEBUG,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 10
            },
            timeManager
          );

          // Create and log error
          const error = new Error(errorMessage);
          logger.logError(error, context);

          // Read log file
          const activePath = getActiveLogPath(logger);
          const logContent = readLogFile(activePath);

          // Cleanup
          cleanupLogFiles(logPath);

          // Verify log entry contains required fields
          expect(logContent).toContain(errorMessage);
          expect(logContent).toContain('stack');
          expect(logContent).toContain('name');
          
          // Verify timestamp and simulated time are present
          expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          expect(logContent).toMatch(/\[SIM:\d+\.\d+s\]/);
          
          // Verify ERROR level (with padding)
          expect(logContent).toMatch(/\[ERROR\s+\]/);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('errors are always logged regardless of log level', () => {
    fc.assert(
      fc.property(
        arbErrorMessage,
        arbLogLevel,
        (errorMessage, logLevel) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          const logger = new EventLogger(
            {
              level: logLevel,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 10
            },
            timeManager
          );

          // Create and log error
          const error = new Error(errorMessage);
          logger.logError(error);

          // Read log file
          const activePath = getActiveLogPath(logger);
          const logContent = readLogFile(activePath);

          // Cleanup
          cleanupLogFiles(logPath);

          // Errors should always be logged
          expect(logContent).toContain(errorMessage);
          expect(logContent).toMatch(/\[ERROR\s+\]/);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 42: Log Level Filtering
// **Validates: Requirements 13.4**
// ============================================================================

describe('Property 42: Log Level Filtering', () => {
  test('only messages at or above configured level are logged', () => {
    fc.assert(
      fc.property(
        arbLogLevel,
        arbLogMessage,
        (configuredLevel, message) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          const logger = new EventLogger(
            {
              level: configuredLevel,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 10
            },
            timeManager
          );

          // Log messages at all levels
          logger.log(LogLevel.DEBUG, `DEBUG: ${message}`);
          logger.log(LogLevel.INFO, `INFO: ${message}`);
          logger.log(LogLevel.WARNING, `WARNING: ${message}`);
          logger.log(LogLevel.ERROR, `ERROR: ${message}`);

          // Read log file
          const activePath = getActiveLogPath(logger);
          const logContent = readLogFile(activePath);

          // Cleanup
          cleanupLogFiles(logPath);

          // Define level hierarchy
          const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR];
          const configuredIndex = levels.indexOf(configuredLevel);

          // Check that only appropriate levels are logged
          for (let i = 0; i < levels.length; i++) {
            const levelName = levels[i].toUpperCase();
            const shouldBeLogged = i >= configuredIndex;
            
            if (shouldBeLogged) {
              expect(logContent).toContain(`${levelName}: ${message}`);
            } else {
              expect(logContent).not.toContain(`${levelName}: ${message}`);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('log level hierarchy is correctly enforced (DEBUG < INFO < WARNING < ERROR)', () => {
    fc.assert(
      fc.property(
        arbLogMessage,
        (message) => {
          // Test each level configuration
          const testCases = [
            { level: LogLevel.DEBUG, expectedCount: 4 },
            { level: LogLevel.INFO, expectedCount: 3 },
            { level: LogLevel.WARNING, expectedCount: 2 },
            { level: LogLevel.ERROR, expectedCount: 1 }
          ];

          for (const testCase of testCases) {
            const logPath = createTempLogPath();
            const timeManager = new TimeManager(1.0);
            const logger = new EventLogger(
              {
                level: testCase.level,
                filepath: logPath,
                rotationPolicy: 'size',
                maxSize: 10
              },
              timeManager
            );

            // Log at all levels
            logger.log(LogLevel.DEBUG, message);
            logger.log(LogLevel.INFO, message);
            logger.log(LogLevel.WARNING, message);
            logger.log(LogLevel.ERROR, message);

            // Count entries
            const activePath = getActiveLogPath(logger);
            const entryCount = countLogEntries(activePath);

            // Cleanup
            cleanupLogFiles(logPath);

            // Verify correct number of entries
            expect(entryCount).toBe(testCase.expectedCount);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Property 43: Log File Rotation
// **Validates: Requirements 13.5**
// ============================================================================

describe('Property 43: Log File Rotation', () => {
  test('size-based rotation creates new file when size limit exceeded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // Number of log entries
        (numEntries) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          
          // Use small max size to trigger rotation
          const logger = new EventLogger(
            {
              level: LogLevel.DEBUG,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 0.001 // 1KB
            },
            timeManager
          );

          // Write enough entries to potentially trigger rotation
          const largeMessage = 'x'.repeat(200); // 200 bytes per message
          for (let i = 0; i < numEntries; i++) {
            logger.log(LogLevel.INFO, `Entry ${i}: ${largeMessage}`);
          }

          // Check if rotation occurred
          const dir = path.dirname(logPath);
          const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
          const base = path.basename(logPath, path.extname(logPath));
          const relatedFiles = files.filter(f => f.startsWith(base));

          // Cleanup
          cleanupLogFiles(logPath);

          // If we wrote enough data, rotation should have occurred
          const totalBytes = numEntries * 200;
          if (totalBytes > 1024) {
            expect(relatedFiles.length).toBeGreaterThan(1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('daily rotation creates date-suffixed log files', () => {
    const logPath = createTempLogPath();
    const timeManager = new TimeManager(1.0);
    const logger = new EventLogger(
      {
        level: LogLevel.DEBUG,
        filepath: logPath,
        rotationPolicy: 'daily',
        maxSize: 10
      },
      timeManager
    );

    // Log a message
    logger.log(LogLevel.INFO, 'Test message for daily rotation');

    // Get active log path
    const activePath = getActiveLogPath(logger);
    
    // Verify date suffix is present
    const date = new Date().toISOString().split('T')[0];
    expect(activePath).toContain(date);

    // Verify file exists
    expect(fs.existsSync(activePath)).toBe(true);

    // Cleanup
    cleanupLogFiles(logPath);
  });

  test('rotation preserves all log entries across files', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }),
        (numEntries) => {
          const logPath = createTempLogPath();
          const timeManager = new TimeManager(1.0);
          
          // Use small max size to trigger rotation
          const logger = new EventLogger(
            {
              level: LogLevel.DEBUG,
              filepath: logPath,
              rotationPolicy: 'size',
              maxSize: 0.001 // 1KB
            },
            timeManager
          );

          // Write entries
          const largeMessage = 'x'.repeat(200);
          for (let i = 0; i < numEntries; i++) {
            logger.log(LogLevel.INFO, `Entry ${i}: ${largeMessage}`);
          }

          // Count total entries across all files
          const dir = path.dirname(logPath);
          const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
          const base = path.basename(logPath, path.extname(logPath));
          const relatedFiles = files.filter(f => f.startsWith(base));

          let totalEntries = 0;
          for (const file of relatedFiles) {
            const filePath = path.join(dir, file);
            totalEntries += countLogEntries(filePath);
          }

          // Cleanup
          cleanupLogFiles(logPath);

          // All entries should be preserved
          expect(totalEntries).toBe(numEntries);
        }
      ),
      { numRuns: 30 }
    );
  });
});
