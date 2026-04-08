import { NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  "https://nextasia.app.n8n.cloud/webhook/082ed348-0d45-4d9b-9d41-ed90cb67dc1e";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  console.log("[api/submit] request body:", JSON.stringify(body, null, 2));

  let n8nRes: Response;
  try {
    n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[api/submit] n8n webhook fetch failed:", err);
    return NextResponse.json(
      { success: false, error: "webhook_unreachable" },
      { status: 502 },
    );
  }

  const responseText = await n8nRes.text();
  console.log("[api/submit] n8n response status:", n8nRes.status);
  console.log("[api/submit] n8n response body:", responseText);

  if (!n8nRes.ok) {
    return NextResponse.json(
      { success: false, error: "n8n_request_failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "登録を受け付けました。",
  });
}
