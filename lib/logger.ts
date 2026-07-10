type LogLevel = "error" | "warn" | "info" | "debug"

type LogContext = Record<string, unknown>

function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === "development"
}

function isServerRuntime(): boolean {
  return typeof window === "undefined"
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error === undefined) {
    return undefined
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(isDevelopmentRuntime() ? { stack: error.stack } : {}),
    }
  }

  return { value: String(error) }
}

function writeLog(
  level: LogLevel,
  message: string,
  extras?: { error?: unknown; context?: LogContext },
): void {
  if (isDevelopmentRuntime()) {
    const writer =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "info"
            ? console.info
            : console.debug

    writer(`[jarvis:${level}]`, message, extras?.error, extras?.context)
    return
  }

  if (level === "error") {
    console.error(
      JSON.stringify({
        level,
        message,
        error: serializeError(extras?.error),
        context: extras?.context,
        timestamp: new Date().toISOString(),
      }),
    )
    return
  }

  if (level === "warn" && isServerRuntime()) {
    console.warn(
      JSON.stringify({
        level,
        message,
        context: extras?.context,
        timestamp: new Date().toISOString(),
      }),
    )
  }
}

export const Logger = {
  error(message: string, error?: unknown, context?: LogContext): void {
    writeLog("error", message, { error, context })
  },

  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, { context })
  },

  info(message: string, context?: LogContext): void {
    if (!isDevelopmentRuntime()) {
      return
    }
    writeLog("info", message, { context })
  },

  debug(message: string, context?: LogContext): void {
    if (!isDevelopmentRuntime()) {
      return
    }
    writeLog("debug", message, { context })
  },
}