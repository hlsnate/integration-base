/**
 * gen:params — Returns the SSM parameter store base path
 */
import { getStack } from "./_utils.ts";

export async function getParams(): Promise<string> {
  return `/integrations/${await getStack()}`;
}

if (import.meta.main) {
  console.log(await getParams());
}
