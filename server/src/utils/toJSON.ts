export function toJSONTransform(
  ret: Record<string, unknown>,
  ...omit: string[]
): Record<string, unknown> {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;

  for (const key of omit) {
    delete ret[key];
  }

  return ret;
}
