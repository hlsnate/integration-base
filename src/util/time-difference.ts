export function timeDifference(from: Temporal.Instant): string {
  const now = Temporal.Now.instant();
  const seconds = Math.floor(now.since(from).total("seconds"));

  if (seconds < 1) return "Less than one second";
  if (seconds < 60) return format(seconds, "second");

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return format(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return format(hours, "hour");

  const days = Math.floor(hours / 24);
  return format(days, "day");
}

function format(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}
