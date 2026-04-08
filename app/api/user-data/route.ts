export const dynamic = "force-dynamic";

const N8N_WEBHOOK =
  "https://nextasia.app.n8n.cloud/webhook/98cd8557-5c9e-4189-abec-86a132e60efb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lineId = searchParams.get("line_id");

  if (!lineId?.trim()) {
    return Response.json({ error: "line_id is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${N8N_WEBHOOK}?line_id=${encodeURIComponent(lineId.trim())}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.log(error);
    return Response.json({ error: "fetch failed" }, { status: 500 });
  }
}
