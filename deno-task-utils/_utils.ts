import { join } from "@std/path";

/** Resolves a path relative to the project root */
export function root(...parts: string[]): string {
  return join(Deno.cwd(), ...parts);
}

/** Extracts stack_name from samconfig.toml */
export async function getStack(): Promise<string> {
  const content = await Deno.readTextFile(root("samconfig.toml"));
  const match = content.match(/stack_name\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("stack_name not found in samconfig.toml");
  if (match[1] === "CHANGEME_STACK_NAME") {
    throw new Error("Change stack_name in samconfig.toml");
  }
  return match[1];
}
