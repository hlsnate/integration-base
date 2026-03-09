import { root } from "./_utils.ts";

const denoJsonc = await Deno.readTextFile(root("deno.jsonc"));

// Reuse the URL already in the import map rather than reconstructing it
const baseUrl = denoJsonc.match(/"@hls\/integration-base\/": "([^"]+)"/)?.[1];
if (!baseUrl) {
  throw new Error(
    "Could not find @hls/integration-base/ in deno.jsonc imports",
  );
}

// baseUrl is e.g. https://raw.githubusercontent.com/ORG/integration-base/vX.X.X/src/
// template.yml is at                                                                  ^^^
// https://raw.githubusercontent.com/ORG/integration-base/vX.X.X/cloudformation/template.yml

const templateUrl = baseUrl.replace(/\/src\/$/, "/cloudformation/template.yml");

const response = await fetch(templateUrl);
if (!response.ok) {
  throw new Error(`Failed to fetch template.yml: ${response.statusText}`);
}

await Deno.writeTextFile(root("template.yml"), await response.text());
console.log(`template.yml downloaded from ${templateUrl}`);
