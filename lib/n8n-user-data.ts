/**
 * User profile fields returned by GET /api/user-data (from n8n / Google Sheet).
 * Must match spreadsheet → n8n → client contract.
 */
export const N8N_GET_USER_WEBHOOK_URL =
  "https://nextasia.app.n8n.cloud/webhook/98cd8557-5c9e-4189-abec-86a132e60efb";

export const USER_DATA_FIELDS = [
  "name",
  "company_name_input",
  "job_title",
  "target_people",
  "ng_people",
  "hobby",
  "self_pr",
  "profile_url",
  "ai_summary",
  "tags",
  "receipt_needed",
  "receipt_name",
] as const;

export type UserDataField = (typeof USER_DATA_FIELDS)[number];

export type UserDataResponse =
  | { status: "not_found" }
  | Record<UserDataField, string>;

/** Unwrap n8n execute response shapes: [{ json: {...} }], { json: {...} }, etc. */
export function unwrapN8nPayload(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return unwrapN8nPayload(raw[0]);
  }
  if (raw && typeof raw === "object" && "json" in raw) {
    return unwrapN8nPayload((raw as { json: unknown }).json);
  }
  if (
    raw &&
    typeof raw === "object" &&
    "body" in raw &&
    (raw as { body: unknown }).body !== undefined
  ) {
    return unwrapN8nPayload((raw as { body: unknown }).body);
  }
  return raw;
}

/** Keep only allowed keys; coerce values to strings. Never pass through full sheet rows. */
export function sanitizeUserDataResponse(raw: unknown): UserDataResponse {
  const unwrapped = unwrapN8nPayload(raw);

  if (unwrapped === null || unwrapped === undefined) {
    return { status: "not_found" };
  }

  if (
    typeof unwrapped === "object" &&
    unwrapped !== null &&
    "status" in unwrapped &&
    (unwrapped as { status: string }).status === "not_found"
  ) {
    return { status: "not_found" };
  }

  if (typeof unwrapped !== "object" || unwrapped === null) {
    return { status: "not_found" };
  }

  const obj = unwrapped as Record<string, unknown>;
  const out = {} as Record<UserDataField, string>;

  for (const key of USER_DATA_FIELDS) {
    const v = obj[key];
    if (v === null || v === undefined) {
      out[key] = "";
    } else if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[key] = String(v);
    } else {
      out[key] = JSON.stringify(v);
    }
  }

  return out;
}
