import { NextResponse } from "next/server";
import {
  N8N_GET_USER_WEBHOOK_URL,
  sanitizeUserDataResponse,
} from "@/lib/n8n-user-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lineId = searchParams.get("line_id")?.trim();

  if (!lineId) {
    return NextResponse.json(
      { error: "line_id query parameter is required" },
      { status: 400 },
    );
  }

  const url = new URL(N8N_GET_USER_WEBHOOK_URL);
  url.searchParams.set("line_id", lineId);

  let n8nRes: Response;
  try {
    n8nRes = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[api/user-data] n8n webhook fetch failed:", err);
    return NextResponse.json(
      { error: "webhook_unreachable" },
      { status: 502 },
    );
  }

  const text = await n8nRes.text();
  console.log("[api/user-data] n8n status:", n8nRes.status);
  console.log("[api/user-data] n8n body:", text);

  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : null;
  } catch {
    console.error("[api/user-data] upstream response is not JSON");
    return NextResponse.json(
      { error: "invalid_upstream_json" },
      { status: 502 },
    );
  }

  const sanitized = sanitizeUserDataResponse(parsed);

  if (!n8nRes.ok) {
    if ("status" in sanitized && sanitized.status === "not_found") {
      return NextResponse.json(sanitized);
    }
    return NextResponse.json({ error: "n8n_error" }, { status: 502 });
  }

  return NextResponse.json(sanitized);
}
