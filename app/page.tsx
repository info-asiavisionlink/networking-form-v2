"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";

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
  job_title: string;
  target_people: string;
  ng_people: string;
  self_pr: string;
  company_pr: string;
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
    job_title: "",
    target_people: "",
    ng_people: "",
    self_pr: "",
    company_pr: "",
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
    job_title: searchParams.get("job_title") ?? "",
    target_people: searchParams.get("target_people") ?? "",
    ng_people: searchParams.get("ng_people") ?? "",
    self_pr: searchParams.get("self_pr") ?? "",
    company_pr: searchParams.get("company_pr") ?? "",
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
    <section className="rounded-xl border border-stone-200/90 bg-white p-6 shadow sm:p-8">
      <h2 className="border-b border-stone-100 pb-4 text-lg font-bold tracking-tight text-stone-900 sm:text-xl">
        {title}
      </h2>
      <div className="mt-6 space-y-7">{children}</div>
    </section>
  );
}

function inputBase() {
  return "w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-base text-stone-900 shadow-sm placeholder:text-stone-400 transition focus:border-amber-600/40 focus:outline-none focus:ring-2 focus:ring-amber-600/15";
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
        const data = (await res.json()) as Record<string, string> & {
          status?: string;
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
            job_title: "",
            target_people: "",
            ng_people: "",
            self_pr: "",
            company_pr: "",
            ai_summary: "",
            tags: "",
            receipt_needed: "",
            receipt_name: "",
          }));
          return;
        }

        setFormData((prev) => ({
          ...prev,
          name: data.name ?? "",
          job_title: data.job_title ?? "",
          target_people: data.target_people ?? "",
          ng_people: data.ng_people ?? "",
          self_pr: data.self_pr ?? "",
          company_pr: data.company_pr ?? data.company_name_input ?? "",
          ai_summary: data.ai_summary ?? "",
          tags: data.tags ?? "",
          receipt_needed: normalizeReceiptNeeded(data.receipt_needed ?? ""),
          receipt_name: data.receipt_name ?? "",
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
    try {
      const payload = {
        ...formData,
        company_name_input: formData.company_pr,
        hobby: "",
        profile_url: "",
      };

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { success?: boolean };
      if (!res.ok || !data.success) {
        setError("送信に失敗しました。もう一度お試しください");
        return;
      }
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("送信に失敗しました。もう一度お試しください");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
        <div
          className="rounded-xl border border-emerald-200/90 bg-white p-10 text-center shadow"
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
    <div className="min-h-full bg-gradient-to-b from-[#f7f3ef] to-white pb-20 pt-10 sm:pb-24 sm:pt-14">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        <header className="mb-10 space-y-4 text-center sm:mb-12 sm:text-left">
          <p className="text-sm font-semibold tracking-wide text-amber-900/80">
            再訪のお客様 · 参加登録
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            参加登録フォーム
          </h1>
        </header>

        <section className="mb-8 rounded-xl border border-stone-200/90 bg-white p-6 shadow sm:p-8">
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
                htmlFor="self_pr_value"
                title="あなたの得意なこと・提供できる価値"
              />
              <textarea
                id="self_pr_value"
                className={`${inputBase()} min-h-[160px] resize-y leading-relaxed`}
                value={formData.self_pr}
                onChange={(e) =>
                  setFormData({ ...formData, self_pr: e.target.value })
                }
              />
            </div>
          </Card>

          <Card title="⑤ 会社PRブロック">
            <div>
              <FieldLabel htmlFor="self_pr" title="自己PR" />
              <textarea
                id="self_pr"
                className={`${inputBase()} min-h-[120px] resize-y leading-relaxed`}
                value={formData.self_pr}
                onChange={(e) =>
                  setFormData({ ...formData, self_pr: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel htmlFor="company_pr" title="会社PR" />
              <textarea
                id="company_pr"
                className={`${inputBase()} min-h-[120px] resize-y leading-relaxed`}
                value={formData.company_pr}
                onChange={(e) =>
                  setFormData({ ...formData, company_pr: e.target.value })
                }
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
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-900 to-stone-800 px-6 py-5 text-lg font-bold text-white shadow-xl shadow-stone-900/20 transition hover:from-amber-800 hover:to-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "送信中..." : "参加登録を完了する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f7f3ef]">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-gradient-to-b from-[#f7f3ef] to-white p-16 text-stone-500">
            読み込み中...
          </div>
        }
      >
        <NetworkingFormPage />
      </Suspense>
    </div>
  );
}
