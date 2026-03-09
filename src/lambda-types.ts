export interface ApiEvent {
  version: string;
  routeKey: string;
  rawPath: string;
  body: string | null;
  headers: Record<string, string>;
  queryStringParameters?: Record<string, string | undefined>;
}

export type LambdaEventSource =
  | "http" // API Gateway / Function URL style
  | "eventbridge" // EventBridge / CloudWatch Events
  | "unknown";

export interface LambdaContext {
  functionName: string;
  awsRequestId: string;
  source: LambdaEventSource;
  isHttp: boolean;
  isEventBridge: boolean;
  getRemainingTimeInMillis(): number;
}

export interface ApiResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export type ScheduledJobResponse = string | Record<string, unknown>;

export type LambdaHandler = (
  event: ApiEvent,
  context: LambdaContext,
) => Promise<ApiResult | ScheduledJobResponse>;
