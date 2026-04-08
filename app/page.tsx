"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";

const WEBHOOK_URL =
  "https://nextasia.app.n8n.cloud/webhook/082ed348-0d45-4d9b-9d41-ed90cb67dc1e";

type FormValues = {
  event_id: string;
  line_id: string;
  event_name: string;
  event_date: string;
  reception_number: string;
  payment_amount: string;
  receipt_needed: string;
  receipt_name: string;
  name: string;
  company_name: string;
  job_title: string;
  target_people: string;
  ng_people: string;
  hobby: string;
  self_pr: string;
  company_pr: string;
  profile_url: string;
  company_info_mode: "self_pr" | "company_pr" | "url" | "";
  ai_summary: string;
  tags: string;
};

const TARGET_HELP_PLACEHOLDER = `例：
・SNSのいいね・シェアなど拡散を手伝ってくれる方
・見込み顧客を紹介してくれる方
・サービスについてフィードバックをくれる方
など`;

const NG_HELP_PLACEHOLDER = `例：
・営業されること
・MLMや強引な勧誘
など`;

function emptyForm(): FormValues {
  return {
    event_id: "",
    line_id: "",
    event_name: "",
    event_date: "",
    reception_number: "",
    payment_amount: "",
    receipt_needed: "",
    receipt_name: "",
    name: "",
    company_name: "",
    job_title: "",
    target_people: "",
    ng_people: "",
    hobby: "",
    self_pr: "",
    company_pr: "",
    profile_url: "",
    company_info_mode: "company_pr",
    ai_summary: "",
    tags: "",
  };
}

function normalizeReceiptNeeded(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  if (
    v === "1" ||
    v === "true" ||
    v === "yes" ||
    v === "on" ||
    v === "希望" ||
    v === "希望する" ||
    v === "希望済み"
  ) {
    return "希望する";
  }
  if (v === "希望しない" || v === "0" || v === "false" || v === "不要") {
    return "希望しない";
  }
  return raw.trim();
}

function paramsFromSearch(searchParams: URLSearchParams): FormValues {
  return {
    event_id: searchParams.get("event_id") ?? "",
    line_id: searchParams.get("line_id") ?? "",
    event_name: searchParams.get("event_name") ?? "",
    event_date: searchParams.get("event_date") ?? "",
    reception_number: searchParams.get("reception_number") ?? "",
    payment_amount: searchParams.get("payment_amount") ?? "",
    receipt_needed: normalizeReceiptNeeded(searchParams.get("receipt_needed") ?? ""),
    receipt_name: searchParams.get("receipt_name") ?? "",
    name: searchParams.get("name") ?? "",
    company_name: searchParams.get("company_name") ?? "",
    job_title: searchParams.get("job_title") ?? "",
    target_people: searchParams.get("target_people") ?? "",
    ng_people: searchParams.get("ng_people") ?? "",
    hobby: searchParams.get("hobby") ?? "",
    self_pr: searchParams.get("self_pr") ?? "",
    company_pr: searchParams.get("company_pr") ?? "",
    profile_url: searchParams.get("profile_url") ?? "",
    company_info_mode:
      (searchParams.get("company_info_mode") as
        | "self_pr"
        | "company_pr"
        | "url"
        | null) ?? "company_pr",
    ai_summary: searchParams.get("ai_summary") ?? "",
    tags: searchParams.get("tags") ?? "",
  };
}

function FieldLabel({
  htmlFor,
  title,
  required,
  hint,
}: {
  htmlFor: string;
  title: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-2">
      <label
        htmlFor={htmlFor}
        className="text-base font-bold tracking-tight text-stone-900"
      >
        {title}
        {required ? (
          <span className="ml-1 text-sm font-semibold text-amber-800">*</span>
        ) : null}
      </label>
      {hint ? (
        <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white/90 border border-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-6 sm:p-8">
      <h2 className="border-b border-zinc-100 pb-4 text-lg font-bold tracking-tight text-stone-900 sm:text-xl">
        {title}
      </h2>
      <div className="mt-6 space-y-7">{children}</div>
    </section>
  );
}

function inputBase() {
  return "w-full bg-white/90 border border-zinc-300 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 shadow-inner rounded-xl px-4 py-3.5 text-base text-stone-900 placeholder:text-stone-400 transition focus:outline-none";
}

function NetworkingFormPage() {
  const searchParams = useSearchParams();
  const stableKey = useMemo(() => searchParams.toString(), [searchParams]);

  const [formData, setFormData] = useState<FormValues>(() =>
    paramsFromSearch(searchParams),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const base = paramsFromSearch(searchParams);
    const lineId = searchParams.get("line_id")?.trim() ?? "";

    setFormData(base);
    if (!lineId) return;

    let cancelled = false;

    const fetchUser = async () => {
      try {
        const res = await fetch(
          `/api/user-data?line_id=${encodeURIComponent(lineId)}`,
        );
        const data = (await res.json()) as {
          status?: string;
          name?: string;
          company_name_input?: string;
          job_title?: string;
          target_people?: string;
          ng_people?: string;
          hobby?: string;
          self_pr?: string;
          profile_url?: string;
          ai_summary?: string;
          tags?: string;
          receipt_needed?: string;
          receipt_name?: string;
        };

        if (cancelled) return;
        if (!res.ok) {
          console.log("[networking form] /api/user-data failed", res.status, data);
          return;
        }
        if (data?.status === "not_found") {
          setFormData((prev) => ({
            ...prev,
            name: "",
            company_name: "",
            job_title: "",
            target_people: "",
            ng_people: "",
            hobby: "",
            self_pr: "",
            company_pr: "",
            profile_url: "",
            ai_summary: "",
            tags: "",
            receipt_needed: "",
            receipt_name: "",
            company_info_mode: "company_pr",
          }));
          return;
        }

        // 指定マッピング（最重要）
        setFormData((prev) => ({
          ...prev,

          // 基本
          name: data.name || "",
          company_name: data.company_name_input || "",
          job_title: data.job_title || "",

          // 交流
          target_people: data.target_people || "",
          ng_people: data.ng_people || "",

          // ここ重要（hobby → 得意なこと）
          hobby: data.hobby || "",

          // PR系
          self_pr: data.self_pr || "",
          company_pr: data.self_pr || "", // fallback

          // URL
          profile_url: data.profile_url || "",

          // 領収書
          receipt_needed: normalizeReceiptNeeded(data.receipt_needed || ""),
          receipt_name: data.receipt_name || "",

          // モード自動判定（重要）: URL優先 → 次に self_pr → それ以外は空
          company_info_mode: data.profile_url
            ? "url"
            : data.self_pr
              ? "self_pr"
              : "",

          // AI
          ai_summary: data.ai_summary || "",
          tags: data.tags || "",
        }));
      } catch (fetchError) {
        console.log(fetchError);
      }
    };

    void fetchUser();
    return () => {
      cancelled = true;
    };
  }, [stableKey]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!formData.reception_number.trim()) {
      setError("受付番号を入力してください。");
      return;
    }
    if (!formData.payment_amount.trim()) {
      setError("お支払い金額を入力してください。");
      return;
    }
    if (
      formData.receipt_needed !== "希望する" &&
      formData.receipt_needed !== "希望しない"
    ) {
      setError("領収書希望を選択してください。");
      return;
    }
    if (!formData.name.trim()) {
      setError("氏名を入力してください。");
      return;
    }
    if (!formData.target_people.trim()) {
      setError("どんな協力を求めていますか？ を入力してください。");
      return;
    }

    setSubmitting(true);
    const params = new URLSearchParams({
      line_id: formData.line_id || "",
      event_id: formData.event_id || "",
      event_name: formData.event_name || "",
      event_date: formData.event_date || "",

      reception_number: formData.reception_number || "",
      amount: formData.payment_amount || "",
      receipt_needed: formData.receipt_needed || "",
      receipt_name: formData.receipt_name || "",

      name: formData.name || "",
      company_name: formData.company_name || "",
      job_title: formData.job_title || "",

      target_people: formData.target_people || "",
      ng_people: formData.ng_people || "",
      hobby: formData.hobby || "",

      self_pr: formData.self_pr || "",
      company_pr: formData.company_pr || "",
      profile_url: formData.profile_url || "",

      ai_summary: formData.ai_summary || "",
      tags: formData.tags || "",
    });

    const url = `${WEBHOOK_URL}?${params.toString()}`;
    window.location.href = url;
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
        <div
          className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_25px_70px_rgba(0,0,0,0.12)] p-10 text-center"
          role="status"
        >
          <p className="text-xl font-bold text-emerald-900">
            参加登録が完了しました🔥
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#fdfaf6] via-[#f7f7f7] to-[#eef1f5] pb-20 pt-10 sm:pb-24 sm:pt-14">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-yellow-100/30 blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl px-5 sm:px-8">
        <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_25px_70px_rgba(0,0,0,0.12)] p-6 sm:p-10">
          <header className="mb-10 space-y-4 text-center sm:mb-12 sm:text-left">
            <p className="text-sm font-semibold tracking-wide text-stone-700">
              再訪のお客様 · 参加登録
            </p>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                参加登録フォーム
              </h1>
              <div className="mt-2 h-[2px] w-20 bg-gradient-to-r from-amber-400 to-transparent" />
            </div>
          </header>

          <section className="mb-8 rounded-2xl bg-white/90 border border-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
              データ受信状況
            </h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-lg bg-stone-50/80 px-4 py-3">
              <dt className="text-xs font-bold text-stone-500">LINE ID</dt>
              <dd className="mt-1 break-all font-mono text-sm font-medium text-stone-900">
                {formData.line_id || "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-stone-50/80 px-4 py-3">
              <dt className="text-xs font-bold text-stone-500">イベントID</dt>
              <dd className="mt-1 break-all font-mono text-sm font-medium text-stone-900">
                {formData.event_id || "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-stone-50/80 px-4 py-3 sm:col-span-2">
              <dt className="text-xs font-bold text-stone-500">イベント名</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">
                {formData.event_name || "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-stone-50/80 px-4 py-3 sm:col-span-2">
              <dt className="text-xs font-bold text-stone-500">開催日</dt>
              <dd className="mt-1 text-sm font-semibold text-stone-900">
                {formData.event_date || "—"}
              </dd>
            </div>
            </dl>
          </section>

          <form className="space-y-8" onSubmit={onSubmit} noValidate>
          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50/90 px-5 py-4 text-sm font-medium text-red-900 shadow-sm"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <Card title="② 受付・支払い">
            <div className="grid gap-7 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="reception_number" title="受付番号" required />
                <input
                  id="reception_number"
                  className={inputBase()}
                  value={formData.reception_number}
                  onChange={(e) =>
                    setFormData({ ...formData, reception_number: e.target.value })
                  }
                  inputMode="numeric"
                  placeholder="運営から伝えられたカードの番号を入力してください"
                />
              </div>
              <div>
                <FieldLabel htmlFor="payment_amount" title="お支払い金額" required />
                <input
                  id="payment_amount"
                  className={inputBase()}
                  value={formData.payment_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_amount: e.target.value })
                  }
                  inputMode="decimal"
                  placeholder="例：3000"
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="receipt_needed_group" title="領収書希望" required />
              <div id="receipt_needed_group" className="mt-3 flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="receipt_needed"
                    checked={formData.receipt_needed === "希望する"}
                    onChange={() =>
                      setFormData({ ...formData, receipt_needed: "希望する" })
                    }
                  />
                  希望する
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="receipt_needed"
                    checked={formData.receipt_needed === "希望しない"}
                    onChange={() =>
                      setFormData({ ...formData, receipt_needed: "希望しない" })
                    }
                  />
                  希望しない
                </label>
              </div>
            </div>
            {formData.receipt_needed === "希望する" ? (
              <div>
                <FieldLabel htmlFor="receipt_name" title="領収書宛名" />
                <input
                  id="receipt_name"
                  className={inputBase()}
                  value={formData.receipt_name}
                  onChange={(e) =>
                    setFormData({ ...formData, receipt_name: e.target.value })
                  }
                />
              </div>
            ) : null}
          </Card>

          <Card title="③ 基本情報">
            <div>
              <FieldLabel htmlFor="name" title="氏名" required />
              <input
                id="name"
                className={inputBase()}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="company_name" title="会社名" />
              <input
                id="company_name"
                className={inputBase()}
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                placeholder="例: 株式会社〇〇"
              />
            </div>
          </Card>

          <Card title="④ 交流情報">
            <div>
              <FieldLabel htmlFor="job_title" title="ご職業" />
              <input
                id="job_title"
                className={inputBase()}
                value={formData.job_title}
                onChange={(e) =>
                  setFormData({ ...formData, job_title: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel
                htmlFor="target_people"
                title="どんな協力を求めていますか？"
                required
              />
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm leading-relaxed text-stone-700">
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
                  例文
                </div>
                <pre className="whitespace-pre-wrap font-sans">{TARGET_HELP_PLACEHOLDER}</pre>
              </div>
              <textarea
                id="target_people"
                className={`${inputBase()} min-h-[160px] resize-y leading-relaxed`}
                value={formData.target_people}
                onChange={(e) =>
                  setFormData({ ...formData, target_people: e.target.value })
                }
                placeholder={TARGET_HELP_PLACEHOLDER}
              />
            </div>
            <div>
              <FieldLabel
                htmlFor="ng_people"
                title="どんな協力は求めていませんか？"
              />
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm leading-relaxed text-stone-700">
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
                  例文
                </div>
                <pre className="whitespace-pre-wrap font-sans">{NG_HELP_PLACEHOLDER}</pre>
              </div>
              <textarea
                id="ng_people"
                className={`${inputBase()} min-h-[140px] resize-y leading-relaxed`}
                value={formData.ng_people}
                onChange={(e) =>
                  setFormData({ ...formData, ng_people: e.target.value })
                }
                placeholder={NG_HELP_PLACEHOLDER}
              />
            </div>
            <div>
              <FieldLabel
                htmlFor="hobby"
                title="あなたの得意なこと・提供できる価値"
              />
              <p className="text-sm leading-relaxed text-stone-500">
                スキル・経験・人脈など、相手の役に立てそうなことを書くと会話のきっかけになります。
              </p>
              <textarea
                id="hobby"
                className={`${inputBase()} min-h-[160px] resize-y leading-relaxed`}
                value={formData.hobby}
                onChange={(e) =>
                  setFormData({ ...formData, hobby: e.target.value })
                }
              />
            </div>
          </Card>

          <Card title="⑤ 会社PRブロック">
            <div>
              <FieldLabel
                htmlFor="company_info_mode"
                title="会社情報の入力モード"
                hint="自動で選択されています。必要なら切り替えてください。"
              />
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-200 bg-white p-2">
                {(
                  [
                    { key: "self_pr", label: "自己PR" },
                    { key: "company_pr", label: "会社PR" },
                    { key: "url", label: "URL" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-semibold transition",
                      formData.company_info_mode === o.key
                        ? "bg-stone-900 text-white"
                        : "bg-stone-50 text-stone-700 hover:bg-stone-100",
                    ].join(" ")}
                    onClick={() =>
                      setFormData({ ...formData, company_info_mode: o.key })
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="self_pr" title="自己PR" />
              <textarea
                id="self_pr"
                className={`${inputBase()} min-h-[120px] resize-y leading-relaxed`}
                value={formData.self_pr}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    self_pr: e.target.value,
                    company_pr: e.target.value,
                  })
                }
                style={{ display: formData.company_info_mode === "self_pr" ? undefined : "none" }}
              />
            </div>
            <div>
              <FieldLabel htmlFor="company_pr" title="会社PR" />
              <textarea
                id="company_pr"
                className={`${inputBase()} min-h-[120px] resize-y leading-relaxed`}
                value={formData.company_pr}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    company_pr: e.target.value,
                    self_pr: e.target.value,
                  })
                }
                style={{ display: formData.company_info_mode === "company_pr" ? undefined : "none" }}
              />
            </div>
            <div style={{ display: formData.company_info_mode === "url" ? undefined : "none" }}>
              <FieldLabel htmlFor="profile_url" title="URL" />
              <input
                id="profile_url"
                className={inputBase()}
                value={formData.profile_url}
                onChange={(e) =>
                  setFormData({ ...formData, profile_url: e.target.value })
                }
                placeholder="https://"
              />
            </div>
          </Card>

          <Card title="⑥ AI情報">
            <div>
              <FieldLabel htmlFor="ai_summary" title="ai_summary" />
              <textarea
                id="ai_summary"
                className={`${inputBase()} min-h-[180px] resize-y leading-relaxed`}
                value={formData.ai_summary}
                onChange={(e) =>
                  setFormData({ ...formData, ai_summary: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel htmlFor="tags" title="tags" />
              <input
                id="tags"
                className={inputBase()}
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </Card>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center bg-black hover:bg-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.3)] rounded-xl px-6 py-5 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "送信中..." : "参加登録を完了する"}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-gradient-to-br from-[#fdfaf6] via-[#f7f7f7] to-[#eef1f5] p-16 text-stone-500">
            読み込み中...
          </div>
        }
      >
        <NetworkingFormPage />
      </Suspense>
    </div>
  );
}
