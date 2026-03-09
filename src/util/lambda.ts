// Lambda Runtime implementation
import {
  ApiEvent,
  ApiResult,
  LambdaContext,
  LambdaEventSource,
  LambdaHandler,
} from "../lambda-types.ts";

export const AWS_LAMBDA_RUNTIME_API = Deno.env.get("AWS_LAMBDA_RUNTIME_API");
export const RUNTIME_PATH = `/2018-06-01/runtime`;

export const DefaultErrorResponse: ApiResult = {
  statusCode: 500,
  body: JSON.stringify({ message: "Internal Server Error" }),
};

export async function processEvents(handler: LambdaHandler): Promise<void> {
  if (!AWS_LAMBDA_RUNTIME_API) {
    console.error("AWS_LAMBDA_RUNTIME_API not set");
    Deno.exit(1);
  }

  const baseUrl = `http://${AWS_LAMBDA_RUNTIME_API}${RUNTIME_PATH}`;

  while (true) {
    try {
      // Wait for next invocation
      const nextEventResponse = await fetch(`${baseUrl}/invocation/next`);

      if (!nextEventResponse.ok) {
        console.error(
          `Failed to get next invocation: ${nextEventResponse.status}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const requestId = nextEventResponse.headers.get(
        "lambda-runtime-aws-request-id",
      );
      if (!requestId) {
        console.error("Missing lambda-runtime-aws-request-id header");
        continue;
      }

      const deadlineMsHeader = nextEventResponse.headers.get(
        "lambda-runtime-deadline-ms",
      );
      const deadlineInstant = deadlineMsHeader
        ? Temporal.Instant.fromEpochMilliseconds(Number(deadlineMsHeader))
        : null;

      const event = await nextEventResponse.json();
      const source = detectSource(event);

      const context: LambdaContext = {
        functionName: Deno.env.get("AWS_LAMBDA_FUNCTION_NAME") ?? "unknown",
        awsRequestId: requestId,
        source,
        isHttp: source === "http",
        isEventBridge: source === "eventbridge",
        getRemainingTimeInMillis() {
          if (!deadlineInstant) return 30_000;

          const now = Temporal.Now.instant();
          const duration = deadlineInstant.since(now);

          // Clamp to >= 0 and return as milliseconds
          const remainingMs = Math.floor(duration.total("milliseconds"));
          return remainingMs > 0 ? remainingMs : 0;
        },
      };

      try {
        const result = await handler(event as ApiEvent, context);

        // Send success response
        const response = await fetch(
          `${baseUrl}/invocation/${requestId}/response`,
          {
            method: "POST",
            body: JSON.stringify(result),
          },
        );

        if (!response.ok) {
          console.error(`Failed to send response: ${response.status}`);
        }
      } catch (error) {
        console.error("Handler error:", error);

        const errorBody = error instanceof Error
          ? {
            errorType: error.constructor.name,
            errorMessage: error.message,
            trace: error.stack?.split("\n") ?? [],
          }
          : {
            errorType: "UnknownError",
            errorMessage: String(error),
            trace: [],
          };

        const errorResponse = await fetch(
          `${baseUrl}/invocation/${requestId}/error`,
          {
            method: "POST",
            body: JSON.stringify(errorBody),
          },
        );

        if (!errorResponse.ok) {
          console.error(`Failed to send error: ${errorResponse.status}`);
        }
      }
    } catch (error) {
      console.error("Runtime error:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function detectSource(event: unknown): LambdaEventSource {
  if (!event || typeof event !== "object") return "unknown";

  const e = event as Record<string, unknown>;

  // API Gateway v2 / Lambda Function URL
  if (
    "requestContext" in e &&
    typeof e.requestContext === "object" &&
    e.requestContext !== null &&
    "http" in e.requestContext
  ) {
    return "http";
  }

  // API Gateway v1 (REST API)
  if ("httpMethod" in e && "resource" in e) {
    return "http";
  }

  // Everything else is scheduled/eventbridge
  return "eventbridge";
}
