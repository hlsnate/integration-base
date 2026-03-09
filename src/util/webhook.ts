import { ApiEvent, LambdaHandler } from "../lambda-types.ts";
import { verifyHMAC } from "./hmac.ts";

export async function validateWebhookSignature(
  event: ApiEvent,
  webhookSecret: string,
): Promise<void> {
  const headers = new Headers(event.headers);
  const signature = headers.get("x-webhook-signature"); // headers.get is case insensitive

  if (!event.body || !signature) {
    throw new Error("Invalid webhook request");
  }

  const isValid = await verifyHMAC(
    event.body,
    webhookSecret,
    signature,
  );

  if (!isValid) {
    throw new Error("Invalid webhook signature");
  }
}

export const noWebhooksHandler: LambdaHandler = (_e, _c) => {
  throw new Error("Webhooks are not handled by this app");
};
