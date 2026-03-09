/**
 * gen:env — Writes .tmp/.env.json with the resolved PARAMS_NAME
 */
import { root } from "./_utils.ts";
import { getParams } from "./params.ts";

const envConfig = {
  IntegrationLambdaFunction: {
    PARAMS_NAME: await getParams(),
  },
};

await Deno.mkdir(root(".tmp"), { recursive: true });
await Deno.writeTextFile(
  root(".tmp/.env.json"),
  JSON.stringify(envConfig, null, 2),
);

console.log("Written: .tmp/.env.json");
