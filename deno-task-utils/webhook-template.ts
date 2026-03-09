import { generateHMAC } from "../src/util/hmac.ts";
import { getParam } from "../src/util/aws-params.ts";
import { getParams } from "./params.ts";
import { root } from "./_utils.ts";

const dataId = Deno.env.get("DATA_ID");
const eventType = Deno.env.get("EVENT_TYPE");
if (!dataId || !eventType) {
  console.error("ERROR: Requires DATA_ID and EVENT_TYPE environment params");
  Deno.exit(1);
}

const template = await Deno.readTextFile(root("events/webhook-template.json"));
const webhookContent = template
  .replaceAll("{{DATA_ID}}", dataId)
  .replaceAll("{{EVENT_TYPE}}", eventType);

const paramsName = await getParams();
const blob = JSON.parse(await getParam(paramsName));
const webhookSecret = blob.WEBHOOK_SECRET;
if (!webhookSecret) throw new Error("WEBHOOK_SECRET not found in config blob");

const hmac = await generateHMAC(JSON.parse(webhookContent).body, webhookSecret);

await Deno.writeTextFile(
  root(".tmp/webhook-event.json"),
  webhookContent.replaceAll("{{SIGNATURE}}", hmac),
);
console.log("Written: .tmp/webhook-event.json");
