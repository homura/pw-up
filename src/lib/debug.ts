export function debug(...args: unknown[]) {
  if (process.env.NODE_ENV !== "development") return;

  console.log(`[pw-up]:`, ...args);
}
