import { z, type ZodAny, type ZodType } from "zod";
import {
  GetParameterCommand,
  GetParametersByPathCommand,
  type Parameter,
  SSMClient,
} from "@aws-sdk/client-ssm";

const PARAMS_NAME = Deno.env.get("PARAMS_NAME");
const SCREAMING_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

const CACHE_TTL_MS = 5 * 60_000; // 5min cache

// Shared client — reused across getAwsParams and getParam
const ssmClient = new SSMClient();

let configCache: unknown = null;
let cacheExpiry: Temporal.Instant | null = null;

/**
 * Fetches a single SSM parameter by full path.
 * Use for one-off lookups (e.g. deno-task-utils scripts).
 * NOTE: not validated unless passed a zod schema.
 */
export async function getParam(
  name: string,
  schema?: ZodAny,
): Promise<string> {
  const response = await ssmClient.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }),
  );
  const value = schema
    ? schema.parse(response.Parameter?.Value)
    : response.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter not found: ${name}`);
  return value;
}

/**
 * Fetches all parameters at PARAMS_NAME path, validates against schema.
 * Caches result for CACHE_TTL_MS to avoid redundant calls within same invocation.
 */
export async function getAwsParams<T extends ZodType>(
  schema: T,
): Promise<z.infer<T>> {
  if (!PARAMS_NAME) {
    throw new Error("PARAMS_NAME environment variable is required");
  }

  const now = Temporal.Now.instant();

  if (
    configCache && cacheExpiry && Temporal.Instant.compare(now, cacheExpiry) < 0
  ) {
    return configCache as z.infer<T>;
  }

  const mergedConfig: Record<string, unknown> = {};

  // Fetch main parameter (base JSON)
  const mainResponse = await ssmClient.send(
    new GetParameterCommand({
      Name: PARAMS_NAME,
      WithDecryption: true,
    }),
  );

  if (mainResponse.Parameter?.Value) {
    Object.assign(mergedConfig, JSON.parse(mainResponse.Parameter.Value));
  }

  // Fetch any additional parameters under the base path
  const allParams: Parameter[] = [];
  let nextToken: string | undefined;

  do {
    const response = await ssmClient.send(
      new GetParametersByPathCommand({
        Path: PARAMS_NAME,
        WithDecryption: true,
        Recursive: false,
        NextToken: nextToken,
      }),
    );

    if (response.Parameters) {
      allParams.push(...response.Parameters);
    }
    nextToken = response.NextToken;
  } while (nextToken);

  for (const param of allParams) {
    if (!param.Name || !param.Value) continue;

    const key = param.Name.slice(String(PARAMS_NAME).length + 1);

    if (!SCREAMING_SNAKE_CASE.test(key)) {
      console.warn(
        `Ignoring parameter ${param.Name}: key "${key}" does not match SCREAMING_SNAKE_CASE convention`,
      );
      continue;
    }

    mergedConfig[key] = param.Value;
  }

  if (Object.keys(mergedConfig).length === 0) {
    throw new Error(`No configuration found at or under ${PARAMS_NAME}`);
  }

  configCache = schema.parse(mergedConfig);
  cacheExpiry = now.add({ milliseconds: CACHE_TTL_MS });

  return configCache as z.infer<T>;
}
