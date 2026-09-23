/**
 * Returns a copy of a Forge event that is safe and compact to log:
 * the context token is shortened and HTTP headers are hidden.
 * Nested objects and arrays are processed recursively.
 */
export function truncateEvents(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(truncateEvents);
  }
  const source = obj as Record<string, unknown>;
  const newObj: Record<string, unknown> = {};
  for (const key in source) {
    if (key === "contextToken") {
      const token = String(source[key]);
      newObj[key] = `${token.slice(0, 3)}...${token.slice(-3)}`;
    } else if (key === "headers") {
      newObj[key] = { "...": "..." };
    } else {
      newObj[key] = truncateEvents(source[key]);
    }
  }
  return newObj;
}
