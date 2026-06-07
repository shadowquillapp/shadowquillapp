/**
 * Tiny hand-rolled type guard helpers. No runtime schema dependency; this
 * is the minimum needed to validate JSON.parse results without `as T`
 * lying to the type system.
 *
 * Schemas return `true` only when the value matches the expected shape.
 * They never throw — invalid input falls through to the caller's default.
 */

export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isString(v: unknown): v is string {
	return typeof v === "string";
}

export function isStringArray(v: unknown): v is string[] {
	return Array.isArray(v) && v.every(isString);
}

export function isOneOf<T extends string>(
	v: unknown,
	allowed: readonly T[],
): v is T {
	return typeof v === "string" && (allowed as readonly string[]).includes(v);
}

export function isArrayOf<T>(
	v: unknown,
	guard: (item: unknown) => item is T,
): v is T[] {
	return Array.isArray(v) && v.every(guard);
}

/**
 * Parse JSON safely. Returns the default on any failure (invalid JSON, schema
 * mismatch, null). Never throws.
 */
export function safeParse<T>(
	raw: string | null,
	guard: (v: unknown) => v is T,
	defaultValue: T,
): T;
export function safeParse<T, F>(
	raw: string | null,
	guard: (v: unknown) => v is T,
	defaultValue: F,
): T | F;
export function safeParse<T, F = T>(
	raw: string | null,
	guard: (v: unknown) => v is T,
	defaultValue: F,
): T | F {
	if (raw == null) return defaultValue;
	try {
		const parsed: unknown = JSON.parse(raw);
		return guard(parsed) ? parsed : defaultValue;
	} catch {
		return defaultValue;
	}
}
