import log from "loglevel";
import process from "node:process";

type LogContext = Record<string, unknown>;

let currentContext: LogContext = {};

export function addLogContext(ctx: LogContext) {
  currentContext = { ...currentContext, ...(ctx ?? {}) };
}

// IMPORTANT Set factory BEFORE setLevel
log.methodFactory = (methodName, _logLevel, _loggerName) => {
  return (...args: unknown[]) => {
    const msg = args.length === 1 ? args[0] : args;
    const jsonMessage = JSON.stringify({
      timestamp: Temporal.Now.instant().toZonedDateTimeISO("America/New_York")
        .toString(),
      level: methodName.toUpperCase(),
      msg,
      ...currentContext,
    }) + "\n";
    process.stdout.write(jsonMessage);
  };
};

// Now setLevel — triggers replaceLoggingMethods() with the custom factory above
switch (Deno.env.get("LOG_LEVEL")?.toLowerCase()) {
  case "trace":
    log.setLevel("trace");
    break;
  case "debug":
    log.setLevel("debug");
    break;
  case "warn":
    log.setLevel("warn");
    break;
  case "error":
    log.setLevel("error");
    break;
  default:
    log.setLevel("info");
}

export default log;

/**
 * Overrides console methods with structured JSON logging.
 * Call once at Lambda handler entry point. Use addLogContext
 * to inject Lambda/other info to all console.* methods
 */
export function useCustomConsoleLogger() {
  console.debug = log.debug;
  console.info = log.info;
  console.log = log.info;
  console.warn = log.warn;
  console.error = log.error;
}
