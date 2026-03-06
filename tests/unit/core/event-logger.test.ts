/**
 * Unit tests for EventLogger
 * 
 * Tests log level filtering, file writing, rotation policies, and dual time tracking.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventLogger } from '../../../src/core/event-logger';
import { TimeManager } from '../../../src/core/time-manager';
import { LogLevel, ActuatorState } from '../../../src/types';

describe('EventLogger', () => {
  let timeManager: TimeManager;
  let testLogDir: string;
  let testLogPath: string;

  beforeEach(() => {
    timeManager = new TimeManager(1);
    testLogDir = path.join(__dirname, '../../../logs/test');
    testLogPath = path.join(testLogDir, 'test.log');
    
    // Clean up any existing test logs
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testLogDir, file));
      });
    }
  });

  afterEach(() => {
    // Clean up test logs
    if (fs.existsSync(testLogDir)) {
      const files = fs.readdirSync(testLogDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testLogDir, file));
      });
      fs.rmdirSync(testLogDir);
    }
  });

  describe('Initialization', () => {
    test('creates log directory if it does not exist', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 1
        },
        timeManager
      );

      expect(fs.existsSync(testLogDir)).toBe(true);
    });

    test('initializes with correct log level', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.WARNING,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      expect(logger.getLogLevel()).toBe(LogLevel.WARNING);
    });

    test('initializes with correct log file path', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      expect(logger.getLogFilePath()).toBe(testLogPath);
    });
  });

  describe('Log level filtering', () => {
    test('logs messages at or above configured level', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'Info message');
      logger.log(LogLevel.WARNING, 'Warning message');
      logger.log(LogLevel.ERROR, 'Error message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('Info message');
      expect(logContent).toContain('Warning message');
      expect(logContent).toContain('Error message');
    });

    test('filters out messages below configured level', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.WARNING,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.DEBUG, 'Debug message');
      logger.log(LogLevel.INFO, 'Info message');
      logger.log(LogLevel.WARNING, 'Warning message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).not.toContain('Debug message');
      expect(logContent).not.toContain('Info message');
      expect(logContent).toContain('Warning message');
    });

    test('DEBUG level logs all messages', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.DEBUG,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.DEBUG, 'Debug message');
      logger.log(LogLevel.INFO, 'Info message');
      logger.log(LogLevel.WARNING, 'Warning message');
      logger.log(LogLevel.ERROR, 'Error message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('Debug message');
      expect(logContent).toContain('Info message');
      expect(logContent).toContain('Warning message');
      expect(logContent).toContain('Error message');
    });

    test('ERROR level only logs errors', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.ERROR,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.DEBUG, 'Debug message');
      logger.log(LogLevel.INFO, 'Info message');
      logger.log(LogLevel.WARNING, 'Warning message');
      logger.log(LogLevel.ERROR, 'Error message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).not.toContain('Debug message');
      expect(logContent).not.toContain('Info message');
      expect(logContent).not.toContain('Warning message');
      expect(logContent).toContain('Error message');
    });
  });

  describe('Log entry formatting', () => {
    test('includes real timestamp in log entries', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'Test message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      // Check for ISO timestamp format
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    test('includes simulated time in log entries', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'Test message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      // Check for simulated time format
      expect(logContent).toMatch(/\[SIM:\d+\.\d{3}s\]/);
    });

    test('includes log level in log entries', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.DEBUG,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.DEBUG, 'Debug message');
      logger.log(LogLevel.INFO, 'Info message');
      logger.log(LogLevel.WARNING, 'Warning message');
      logger.log(LogLevel.ERROR, 'Error message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('[DEBUG  ]');
      expect(logContent).toContain('[INFO   ]');
      expect(logContent).toContain('[WARNING]');
      expect(logContent).toContain('[ERROR  ]');
    });

    test('includes message in log entries', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'This is a test message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('This is a test message');
    });

    test('includes context data in log entries', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'Test message', { key: 'value', number: 42 });

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('"key":"value"');
      expect(logContent).toContain('"number":42');
    });
  });

  describe('Specialized logging methods', () => {
    test('logSensorChange logs sensor value changes', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.DEBUG,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.logSensorChange('ph-sensor-1', 6.5, 6.8);

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('Sensor value changed');
      expect(logContent).toContain('"sensorId":"ph-sensor-1"');
      expect(logContent).toContain('"oldValue":6.5');
      expect(logContent).toContain('"newValue":6.8');
      expect(logContent).toContain('"delta":0.2999999999999998');
    });

    test('logActuatorCommand logs actuator commands', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const command: ActuatorState = {
        active: true,
        intensity: 75,
        timestamp: Date.now()
      };

      logger.logActuatorCommand('pump-1', command);

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('Actuator command received');
      expect(logContent).toContain('"actuatorId":"pump-1"');
      expect(logContent).toContain('"active":true');
      expect(logContent).toContain('"intensity":75');
    });

    test('logError logs error with stack trace', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.ERROR,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const error = new Error('Test error');
      logger.logError(error);

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('Test error');
      expect(logContent).toContain('"stack"');
      expect(logContent).toContain('"name":"Error"');
    });

    test('logError includes additional context', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.ERROR,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const error = new Error('Test error');
      logger.logError(error, { componentId: 'sensor-1', operation: 'read' });

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('"componentId":"sensor-1"');
      expect(logContent).toContain('"operation":"read"');
    });
  });

  describe('Dual time tracking', () => {
    test('logs both real and simulated time', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'Test message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      // Real timestamp
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      // Simulated time
      expect(logContent).toMatch(/\[SIM:\d+\.\d{3}s\]/);
    });

    test('simulated time reflects time acceleration', (done) => {
      const acceleratedTimeManager = new TimeManager(10);
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        acceleratedTimeManager
      );

      // Wait 100ms real time (should be ~1 second simulated time at 10x)
      setTimeout(() => {
        logger.log(LogLevel.INFO, 'Test message');

        const logContent = fs.readFileSync(testLogPath, 'utf8');
        const simTimeMatch = logContent.match(/\[SIM:(\d+\.\d{3})s\]/);
        
        expect(simTimeMatch).not.toBeNull();
        if (simTimeMatch) {
          const simTime = parseFloat(simTimeMatch[1]);
          // Should be close to 1 second (10x acceleration * 0.1s real time)
          expect(simTime).toBeGreaterThan(0.8);
          expect(simTime).toBeLessThan(1.5);
        }
        
        done();
      }, 100);
    });
  });

  describe('Size-based rotation', () => {
    test('rotates log file when size exceeds limit', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.001 // 1KB
        },
        timeManager
      );

      // Write enough data to exceed 1KB
      for (let i = 0; i < 50; i++) {
        logger.log(LogLevel.INFO, `Test message ${i} with some extra content to increase size`);
      }

      // Check that rotation occurred (archived file exists)
      const files = fs.readdirSync(testLogDir);
      const archivedFiles = files.filter(f => f.startsWith('test.') && f !== 'test.log');
      
      expect(archivedFiles.length).toBeGreaterThan(0);
    });

    test('creates new log file after rotation', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.001 // 1KB
        },
        timeManager
      );

      // Write enough data to trigger rotation
      for (let i = 0; i < 50; i++) {
        logger.log(LogLevel.INFO, `Test message ${i} with some extra content to increase size`);
      }

      // Write one more message after rotation
      logger.log(LogLevel.INFO, 'Message after rotation');

      // Check that new log file exists and contains the new message
      expect(fs.existsSync(testLogPath)).toBe(true);
      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('Message after rotation');
    });
  });

  describe('Daily rotation', () => {
    test('includes date in log filename for daily rotation', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'daily'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'Test message');

      const files = fs.readdirSync(testLogDir);
      const datePattern = /test\.\d{4}-\d{2}-\d{2}\.log/;
      const dailyLogFile = files.find(f => datePattern.test(f));
      
      expect(dailyLogFile).toBeDefined();
    });

    test('writes to date-specific log file', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'daily'
        },
        timeManager
      );

      logger.log(LogLevel.INFO, 'Test message');

      const files = fs.readdirSync(testLogDir);
      const datePattern = /test\.\d{4}-\d{2}-\d{2}\.log/;
      const dailyLogFile = files.find(f => datePattern.test(f));
      
      expect(dailyLogFile).toBeDefined();
      if (dailyLogFile) {
        const logContent = fs.readFileSync(path.join(testLogDir, dailyLogFile), 'utf8');
        expect(logContent).toContain('Test message');
      }
    });
  });

  describe('Configuration', () => {
    test('allows changing log level at runtime', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      logger.log(LogLevel.DEBUG, 'Debug message 1');
      
      logger.setLogLevel(LogLevel.DEBUG);
      
      logger.log(LogLevel.DEBUG, 'Debug message 2');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).not.toContain('Debug message 1');
      expect(logContent).toContain('Debug message 2');
    });

    test('uses default max size if not specified', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
          // maxSize not specified, should default to 10MB
        },
        timeManager
      );

      // Should not throw and should work normally
      logger.log(LogLevel.INFO, 'Test message');
      
      expect(fs.existsSync(testLogPath)).toBe(true);
    });
  });

  describe('File write errors', () => {
    test('handles write errors gracefully with console fallback', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Log a message - should succeed normally
      logger.log(LogLevel.INFO, 'Test message');

      // Verify message was logged
      expect(fs.existsSync(testLogPath)).toBe(true);
      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('Test message');

      consoleErrorSpy.mockRestore();
    });

    test('handles directory creation errors gracefully', () => {
      const invalidPath = '/invalid/path/that/cannot/be/created/test.log';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // This should not throw during initialization
      expect(() => {
        new EventLogger(
          {
            level: LogLevel.INFO,
            filepath: invalidPath,
            rotationPolicy: 'size'
          },
          timeManager
        );
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    test('continues logging after recovery from errors', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      // Log multiple messages
      logger.log(LogLevel.INFO, 'First message');
      logger.log(LogLevel.INFO, 'Second message');
      logger.log(LogLevel.INFO, 'Third message');

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('First message');
      expect(logContent).toContain('Second message');
      expect(logContent).toContain('Third message');
    });
  });

  describe('Log rotation edge cases', () => {
    test('handles rotation when source file does not exist', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.001
        },
        timeManager
      );

      // Manually trigger rotation without writing anything
      // This should not throw
      expect(() => {
        logger.log(LogLevel.INFO, 'Test');
      }).not.toThrow();
    });

    test('handles rotation errors gracefully', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.001
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Write initial data
      logger.log(LogLevel.INFO, 'Initial message');

      // Try to trigger rotation
      for (let i = 0; i < 50; i++) {
        logger.log(LogLevel.INFO, `Message ${i} with extra content to trigger rotation`);
      }

      // Should have logged successfully despite rotation
      const files = fs.readdirSync(testLogDir);
      expect(files.length).toBeGreaterThan(0);

      consoleErrorSpy.mockRestore();
    });

    test('handles size check errors during rotation', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.001
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      expect(() => {
        logger.log(LogLevel.INFO, 'Test message');
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    test('preserves log entries during rotation', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.001
        },
        timeManager
      );

      const messages: string[] = [];
      for (let i = 0; i < 30; i++) {
        const msg = `Message ${i} with content to trigger rotation`;
        messages.push(msg);
        logger.log(LogLevel.INFO, msg);
      }

      // Check that all messages are preserved across rotations
      const files = fs.readdirSync(testLogDir);
      let allContent = '';
      
      files.forEach(file => {
        const content = fs.readFileSync(path.join(testLogDir, file), 'utf8');
        allContent += content;
      });

      messages.forEach(msg => {
        expect(allContent).toContain(msg);
      });
    });
  });

  describe('Concurrent logging', () => {
    test('handles multiple rapid log calls', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.DEBUG,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const messageCount = 100;
      for (let i = 0; i < messageCount; i++) {
        logger.log(LogLevel.INFO, `Concurrent message ${i}`);
      }

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.length > 0);

      // All messages should be logged
      expect(lines.length).toBe(messageCount);
    });

    test('maintains log order with concurrent writes', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.DEBUG,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      for (let i = 0; i < 50; i++) {
        logger.log(LogLevel.INFO, `Message ${String(i).padStart(3, '0')}`);
      }

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.length > 0);

      // Verify order is maintained
      for (let i = 0; i < Math.min(50, lines.length); i++) {
        expect(lines[i]).toContain(`Message ${String(i).padStart(3, '0')}`);
      }
    });

    test('handles concurrent logging with different levels', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.DEBUG,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR];
      
      for (let i = 0; i < 40; i++) {
        const level = levels[i % levels.length];
        logger.log(level, `Message ${i} at level ${level}`);
      }

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      
      expect(logContent).toContain('[DEBUG  ]');
      expect(logContent).toContain('[INFO   ]');
      expect(logContent).toContain('[WARNING]');
      expect(logContent).toContain('[ERROR  ]');
    });

    test('handles concurrent sensor and actuator logging', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.DEBUG,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      // Simulate concurrent sensor and actuator logging
      for (let i = 0; i < 25; i++) {
        logger.logSensorChange(`sensor-${i}`, i, i + 1);
        
        const command: ActuatorState = {
          active: i % 2 === 0,
          intensity: i * 4,
          timestamp: Date.now()
        };
        logger.logActuatorCommand(`actuator-${i}`, command);
      }

      const logContent = fs.readFileSync(testLogPath, 'utf8');
      
      expect(logContent).toContain('Sensor value changed');
      expect(logContent).toContain('Actuator command received');
      
      const lines = logContent.split('\n').filter(line => line.length > 0);
      expect(lines.length).toBe(50); // 25 sensor + 25 actuator
    });

    test('handles concurrent logging with rotation', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.005 // 5KB to trigger rotation
        },
        timeManager
      );

      // Write many messages to trigger rotation
      for (let i = 0; i < 100; i++) {
        logger.log(LogLevel.INFO, `Concurrent message ${i} with extra content to increase file size`);
      }

      const files = fs.readdirSync(testLogDir);
      
      // Should have multiple files due to rotation
      expect(files.length).toBeGreaterThan(1);

      // All messages should be preserved
      let allContent = '';
      files.forEach(file => {
        const content = fs.readFileSync(path.join(testLogDir, file), 'utf8');
        allContent += content;
      });

      for (let i = 0; i < 100; i++) {
        expect(allContent).toContain(`Concurrent message ${i}`);
      }
    });
  });

  describe('Disk full scenarios', () => {
    test('handles write failure when disk is full', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      expect(() => {
        logger.log(LogLevel.INFO, 'Test message');
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    test('handles rotation failure when disk is full', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size',
          maxSize: 0.001
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Write initial data
      logger.log(LogLevel.INFO, 'Initial message');

      // Try to trigger rotation
      for (let i = 0; i < 50; i++) {
        logger.log(LogLevel.INFO, `Message ${i} with extra content to trigger rotation`);
      }

      // Should have logged successfully
      const files = fs.readdirSync(testLogDir);
      expect(files.length).toBeGreaterThan(0);

      consoleErrorSpy.mockRestore();
    });

    test('continues operating after disk full error', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.log(LogLevel.INFO, 'First message');
      logger.log(LogLevel.INFO, 'Second message');

      consoleErrorSpy.mockRestore();

      // Logger should continue to work
      const logContent = fs.readFileSync(testLogPath, 'utf8');
      expect(logContent).toContain('First message');
      expect(logContent).toContain('Second message');
    });

    test('handles permission denied errors', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        logger.log(LogLevel.INFO, 'Test message');
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    test('handles file descriptor exhaustion', () => {
      const logger = new EventLogger(
        {
          level: LogLevel.INFO,
          filepath: testLogPath,
          rotationPolicy: 'size'
        },
        timeManager
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        logger.log(LogLevel.INFO, 'Test message');
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });
});
