// Package logging provides logging functionality for the MCP SDK.
//
// This package implements a flexible logging interface that can be used
// throughout the MCP SDK for structured logging and debugging.
package logging

import (
	"io"
	"log"
	"os"
	"strings"
)

// Level represents the severity level of a log message.
type Level int

const (
	// DebugLevel is the lowest level, used for detailed debugging information.
	DebugLevel Level = iota

	// InfoLevel is used for general information about program execution.
	InfoLevel

	// WarnLevel is used for warnings that don't stop execution.
	WarnLevel

	// ErrorLevel is used for errors that prevent normal execution.
	ErrorLevel

	// DisabledLevel disables all logging.
	DisabledLevel
)

// String returns the string representation of the log level.
func (l Level) String() string {
	switch l {
	case DebugLevel:
		return "DEBUG"
	case InfoLevel:
		return "INFO"
	case WarnLevel:
		return "WARN"
	case ErrorLevel:
		return "ERROR"
	case DisabledLevel:
		return "DISABLED"
	default:
		return "UNKNOWN"
	}
}

// ParseLevel parses a string into a log level.
func ParseLevel(s string) Level {
	switch strings.ToUpper(s) {
	case "DEBUG":
		return DebugLevel
	case "INFO":
		return InfoLevel
	case "WARN":
		return WarnLevel
	case "ERROR":
		return ErrorLevel
	case "DISABLED":
		return DisabledLevel
	default:
		return InfoLevel
	}
}

// Logger provides logging functionality for MCP operations.
type Logger interface {
	// Debug logs debug information.
	Debug(msg string, args ...interface{})

	// Info logs general information.
	Info(msg string, args ...interface{})

	// Warn logs warnings.
	Warn(msg string, args ...interface{})

	// Error logs errors.
	Error(msg string, args ...interface{})

	// SetLevel sets the minimum log level.
	SetLevel(level Level)

	// GetLevel returns the current log level.
	GetLevel() Level
}

// DefaultLogger is a basic implementation of the Logger interface.
type DefaultLogger struct {
	level  Level
	logger *log.Logger
}

// NewLogger creates a new logger with the specified output and level.
func NewLogger(level Level) Logger {
	return &DefaultLogger{
		level:  level,
		logger: log.New(os.Stderr, "[MCP] ", log.LstdFlags),
	}
}

// NewLoggerWithOutput creates a new logger with custom output.
func NewLoggerWithOutput(output io.Writer, level Level) Logger {
	return &DefaultLogger{
		level:  level,
		logger: log.New(output, "[MCP] ", log.LstdFlags),
	}
}

// SetLevel sets the minimum log level.
func (l *DefaultLogger) SetLevel(level Level) {
	l.level = level
}

// GetLevel returns the current log level.
func (l *DefaultLogger) GetLevel() Level {
	return l.level
}

// Debug logs debug information.
func (l *DefaultLogger) Debug(msg string, args ...interface{}) {
	if l.level <= DebugLevel {
		l.logger.Printf("DEBUG: "+msg, args...)
	}
}

// Info logs general information.
func (l *DefaultLogger) Info(msg string, args ...interface{}) {
	if l.level <= InfoLevel {
		l.logger.Printf("INFO: "+msg, args...)
	}
}

// Warn logs warnings.
func (l *DefaultLogger) Warn(msg string, args ...interface{}) {
	if l.level <= WarnLevel {
		l.logger.Printf("WARN: "+msg, args...)
	}
}

// Error logs errors.
func (l *DefaultLogger) Error(msg string, args ...interface{}) {
	if l.level <= ErrorLevel {
		l.logger.Printf("ERROR: "+msg, args...)
	}
}

// NoOpLogger is a logger that does nothing.
type NoOpLogger struct{}

// NewNoOpLogger creates a logger that discards all messages.
func NewNoOpLogger() Logger {
	return &NoOpLogger{}
}

// SetLevel does nothing for NoOpLogger.
func (l *NoOpLogger) SetLevel(level Level) {}

// GetLevel returns DisabledLevel for NoOpLogger.
func (l *NoOpLogger) GetLevel() Level { return DisabledLevel }

// Debug does nothing for NoOpLogger.
func (l *NoOpLogger) Debug(msg string, args ...interface{}) {}

// Info does nothing for NoOpLogger.
func (l *NoOpLogger) Info(msg string, args ...interface{}) {}

// Warn does nothing for NoOpLogger.
func (l *NoOpLogger) Warn(msg string, args ...interface{}) {}

// Error does nothing for NoOpLogger.
func (l *NoOpLogger) Error(msg string, args ...interface{}) {}

// Global logger instance
var defaultLogger Logger = NewLogger(InfoLevel)

// SetDefaultLogger sets the global logger instance.
func SetDefaultLogger(logger Logger) {
	defaultLogger = logger
}

// GetDefaultLogger returns the global logger instance.
func GetDefaultLogger() Logger {
	return defaultLogger
}

// Convenience functions that use the default logger

// Debug logs debug information using the default logger.
func Debug(msg string, args ...interface{}) {
	defaultLogger.Debug(msg, args...)
}

// Info logs general information using the default logger.
func Info(msg string, args ...interface{}) {
	defaultLogger.Info(msg, args...)
}

// Warn logs warnings using the default logger.
func Warn(msg string, args ...interface{}) {
	defaultLogger.Warn(msg, args...)
}

// Error logs errors using the default logger.
func Error(msg string, args ...interface{}) {
	defaultLogger.Error(msg, args...)
}
