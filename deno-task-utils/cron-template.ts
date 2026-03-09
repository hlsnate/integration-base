/**
 * gen:cron-template — Writes .tmp/cron-event.json with STACK_NAME substituted
 */
import { getStack, root } from "./_utils.ts";

const stack = await getStack();
const template = await Deno.readTextFile(root("events/cron-template.json"));

await Deno.writeTextFile(
  root(".tmp/cron-event.json"),
  template.replaceAll("{{STACK_NAME}}", stack),
);

console.log("Written: .tmp/cron-event.json");
