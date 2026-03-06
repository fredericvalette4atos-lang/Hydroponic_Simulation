/**
 * EventLogger - Handles event logging for the simulation
 * 
 * This class provides comprehensive logging functionality with level filtering,
 * file rotation, and dual time tracking (real and simulated time). It supports
 * different log levels (DEBUG, INFO, WARNING, ERROR) and can rotate log files
 * based on size or daily schedule.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import * as fs from 'fs';
import * as path from 'path';
import { LogLevel, LogEntry, ActuatorState } from '../types';
import { TimeManager } from './time-manager';

export class EventLogger {
  private logLevel: LogLevel;
  private logFilePath: string;
  private rotationPolicy: 'daily' | 'size';
  private maxSizeBytes: number;
  private timeManager: TimeManager;
  private currentLogDate: string | null;

  /**
   * Create a new EventLogger
   * @param config - Logger configuration
   * @param timeManager - TimeManager instance for dual time tracking
   */
  constructor(
    config: {
      level: LogLevel;
      filepath: string;
      rotationPolicy: 'daily' | 'size';
      maxSize?: number; // MB
    },
    timeManager: TimeManager
  ) {
    this.logLevel = config.level;
    this.logFilePath = config.filepath;
    this.rotationPolicy = config.rotationPolicy;
    this.maxSizeBytes = (config.maxSize || 10) * 1024 * 1024; // Convert MB to bytes
    this.timeManager = timeManager;
    this.currentLogDate = null;

    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Initialize current log date for daily rotation
    if (this.rotationPolicy === 'daily') {
      this.currentLogDate = this.getCurrentDate();
    }
  }

  /**
   * Log a message with the specified level
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional context data
   */
  log(level: LogLevel, message: string, context?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      simulatedTime: this.timeManager.getSimulatedTime(),
      level,
      message,
      context
    };

    this.writeToFile(entry);
  }

  /**
   * Log a sensor value change
   * @param sensorId - Sensor identifier
   * @param oldValue - Previous sensor value
   * @param newValue - New sensor value
   */
  logSensorChange(sensorId: string, oldValue: number, newValue: number): void {
    this.log(LogLevel.DEBUG, 'Sensor value changed', {
      sensorId,
      oldValue,
      newValue,
      delta: newValue - oldValue
    });
  }

  /**
   * Log an actuator command
   * @param actuatorId - Actuator identifier
   * @param command - Actuator command/state
   */
  logActuatorCommand(actuatorId: string, command: ActuatorState): void {
    this.log(LogLevel.INFO, 'Actuator command received', {
      actuatorId,
      command
    });
  }

  /**
   * Log an error with stack trace
   * @param error - Error object
   * @param context - Optional additional context
   */
  logError(error: Error, context?: any): void {
    this.log(LogLevel.ERROR, error.message, {
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  /**
   * Check if a log level should be logged based on current configuration
   * @param level - Log level to check
   * @returns true if the level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Write a log entry to file with rotation handling
   * @param entry - Log entry to write
   */
  private writeToFile(entry: LogEntry): void {
    // Check if rotation is needed
    this.checkAndRotate();

    // Format log entry
    const formattedEntry = this.formatLogEntry(entry);

    // Append to log file
    try {
      fs.appendFileSync(this.getActiveLogFilePath(), formattedEntry + '\n', 'utf8');
    } catch (error) {
      // If we can't write to the log file, write to stderr as fallback
      console.error('Failed to write to log file:', error);
      console.error('Log entry:', formattedEntry);
    }
  }

  /**
   * Format a log entry as a string
   * @param entry - Log entry to format
   * @returns Formatted log string
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const simTime = entry.simulatedTime.toFixed(3);
    const level = entry.level.toUpperCase().padEnd(7);
    const message = entry.message;
    
    let formatted = `[${timestamp}] [SIM:${simTime}s] [${level}] ${message}`;
    
    if (entry.context) {
      formatted += ` | ${JSON.stringify(entry.context)}`;
    }
    
    return formatted;
  }

  /**
   * Check if log rotation is needed and perform rotation if necessary
   */
  private checkAndRotate(): void {
    if (this.rotationPolicy === 'daily') {
      this.checkDailyRotation();
    } else {
      this.checkSizeRotation();
    }
  }

  /**
   * Check and perform daily rotation if date has changed
   */
  private checkDailyRotation(): void {
    const currentDate = this.getCurrentDate();
    
    if (this.currentLogDate !== currentDate) {
      this.rotateLogFile();
      this.currentLogDate = currentDate;
    }
  }

  /**
   * Check and perform size-based rotation if file exceeds max size
   */
  private checkSizeRotation(): void {
    const logPath = this.getActiveLogFilePath();
    
    try {
      if (fs.existsSync(logPath)) {
        const stats = fs.statSync(logPath);
        if (stats.size >= this.maxSizeBytes) {
          this.rotateLogFile();
        }
      }
    } catch (error) {
      console.error('Failed to check log file size:', error);
    }
  }

  /**
   * Rotate the log file by renaming it with a timestamp
   */
  private rotateLogFile(): void {
    const currentPath = this.getActiveLogFilePath();
    
    if (!fs.existsSync(currentPath)) {
      return; // Nothing to rotate
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(currentPath);
      const base = path.basename(currentPath, ext);
      const dir = path.dirname(currentPath);
      const archivePath = path.join(dir, `${base}.${timestamp}${ext}`);
      
      fs.renameSync(currentPath, archivePath);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Get the current date string for daily rotation
   * @returns Date string in YYYY-MM-DD format
   */
  private getCurrentDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Get the active log file path (with date suffix for daily rotation)
   * @returns Full path to the active log file
   */
  private getActiveLogFilePath(): string {
    if (this.rotationPolicy === 'daily') {
      const ext = path.extname(this.logFilePath);
      const base = path.basename(this.logFilePath, ext);
      const dir = path.dirname(this.logFilePath);
      const date = this.getCurrentDate();
      return path.join(dir, `${base}.${date}${ext}`);
    }
    
    return this.logFilePath;
  }

  /**
   * Ensure the log directory exists
   */
  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logFilePath);
    
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Set the log level
   * @param level - New log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get the log file path
   * @returns Log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}
