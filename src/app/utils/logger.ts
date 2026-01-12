type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let minLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel) {
  minLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

// Patterns to redact from logs
const REDACT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, // JWT tokens
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, // Base64 JWT
  /api[_-]?key[=:]\s*["']?[A-Za-z0-9\-_]+["']?/gi, // API keys
  /password[=:]\s*["']?[^"'\s]+["']?/gi, // Passwords
  /secret[=:]\s*["']?[^"'\s]+["']?/gi, // Secrets
  /wrapped[_-]?key[=:]\s*["']?[A-Za-z0-9+/=]+["']?/gi // Wrapped keys
];

export function redactSecrets(message: string): string {
  let redacted = message;
  for (const pattern of REDACT_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

function formatMessage(level: LogLevel, message: string, context?: string): string {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[${context}]` : "";
  const safeMessage = redactSecrets(message);
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${safeMessage}`.trim();
}

export const logger = {
  debug(message: string, context?: string) {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, context));
  },
  info(message: string, context?: string) {
    if (shouldLog("info")) console.info(formatMessage("info", message, context));
  },
  warn(message: string, context?: string) {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, context));
  },
  error(message: string, error?: unknown, context?: string) {
    if (shouldLog("error")) {
      const safeError = error instanceof Error ? redactSecrets(error.message) : error;
      console.error(formatMessage("error", message, context), safeError ?? "");
    }
  }
};
