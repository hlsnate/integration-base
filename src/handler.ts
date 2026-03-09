import { addLogContext, useCustomConsoleLogger } from "./util/logger.ts";
import type { LambdaHandler } from "./lambda-types.ts";
import { DefaultErrorResponse } from "./util/lambda.ts";

export interface HandlerOptions {
  webhook?: LambdaHandler;
  scheduled?: LambdaHandler;
}

export function createLambdaHandler(options: HandlerOptions): LambdaHandler {
  useCustomConsoleLogger();

  return async (event, context) => {
    const { awsRequestId, source } = context;
    addLogContext({ awsRequestId, source });

    if (context.isEventBridge) {
      if (!options.scheduled) {
        console.error("Scheduled access not enabled for this function");
        return DefaultErrorResponse;
      }
      return await options.scheduled(event, context);
    }

    if (context.isHttp) {
      const TRIGGER_TYPE = Deno.env.get("TRIGGER_TYPE") ?? "both";
      if (TRIGGER_TYPE === "webhook" || TRIGGER_TYPE === "both") {
        if (!options.webhook) {
          console.error("Webhook handler not defined");
          return DefaultErrorResponse;
        }
        return await options.webhook(event, context);
      }
      console.error("Webhook access not enabled for this function");
      return DefaultErrorResponse;
    }

    return DefaultErrorResponse;
  };
}
