"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { USER_DATA_FIELDS } from "@/lib/n8n-user-data";

const QUERY_KEYS = [
  "event_id",
  "line_id",
  "event_name",
  "event_date",
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

type QueryKey = (typeof QUERY_KEYS)[number];

type FormValues = Record<QueryKey, string> & {
  reception_number: string;
  payment_amount: string;
};

function emptyForm(): FormValues {
  const base = {} as FormValues;
  for (const key of QUERY_KEYS) {
    base[key] = "";
  }
  base.reception_number = "";
  base.payment_amount = "";
  return base;
}

function paramsFromSearch(searchParams: URLSearchParams): FormValues {
  const next = emptyForm();
  for (const key of QUERY_KEYS) {
    next[key] = searchParams.get(key) ?? "";
  }
  return next;
}

function wantsReceipt(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return (
    v === "1" ||
    v === "true" ||
    v === "yes" ||
    v === "on" ||
    v === "希望" ||
    v === "希望する" ||
    v === "希望済み"
  );
}

function labelClass() {
  return "block text-sm font-medium text-zinc-700 dark:text-zinc-300";
}

function inputClass(editable: boolean) {
  return [
    "mt-1 w-full rounded-lg border px-3 py-2 text-base text-zinc-900 shadow-sm outline-none transition",
    "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50",
    editable
      ? "focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      : "cursor-not-allowed bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  ].join(" ");
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ReturningParticipantForm() {
  const searchParams = useSearchParams();
  const stableKey = useMemo(() => searchParams.toString(), [searchParams]);

  const [values, setValues] = useState<FormValues>(() =>
    paramsFromSearch(searchParams),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    setSuccess(false);
    setError(null);

    const base = paramsFromSearch(searchParams);
    const lineId = base.line_id.trim();

    setValues(base);

    if (!lineId) {
      setProfileLoading(false);
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    setProfileLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/user-data?line_id=${encodeURIComponent(lineId)}`,
          { signal: ac.signal },
        );

        let data: unknown;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (cancelled) return;

        if (!res.ok) {
          console.warn(
            "[returning form] user-data request failed",
            res.status,
            data,
          );
          return;
        }

        if (
          data &&
          typeof data === "object" &&
          "status" in data &&
          (data as { status: string }).status === "not_found"
        ) {
          return;
        }

        if (!data || typeof data !== "object") {
          return;
        }

        const row = data as Record<string, unknown>;

        setValues((prev) => {
          const next = { ...prev };
          for (const key of USER_DATA_FIELDS) {
            const v = row[key];
            next[key] =
              v === null || v === undefined
                ? ""
                : typeof v === "string" ||
                    typeof v === "number" ||
                    typeof v === "boolean"
                  ? String(v)
                  : JSON.stringify(v);
          }
          return next;
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.warn("[returning form] user-data fetch error", e);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [searchParams, stableKey]);

  const receiptLabel =
    wantsReceipt(values.receipt_needed) || values.receipt_name.trim()
      ? "希望済み"
      : "不要";

  function update<K extends keyof FormValues>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!values.reception_number.trim()) {
      setError("受付番号を入力してください。");
      return;
    }
    if (!values.payment_amount.trim()) {
      setError("支払い金額を入力してください。");
      return;
    }

    const payload = { ...values };

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[returning form] submit response", res);

      let data: { success?: boolean; message?: string } = {};
      try {
        data = (await res.json()) as { success?: boolean; message?: string };
      } catch {
        /* non-JSON body */
      }

      console.log("[returning form] submit response body", data);

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
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40"
          role="status"
        >
          <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            参加登録が完了しました🔥
          </p>
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
            ご登録ありがとうございます。当日お待ちしております。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 space-y-2">
        <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
          再参加の方 · クイック登録
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          参加登録（再訪）
        </h1>
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          前回の情報を元に入力されています。必要に応じて修正してください
        </p>
        {profileLoading ? (
          <p
            className="text-sm text-zinc-500 dark:text-zinc-400"
            role="status"
            aria-live="polite"
          >
            プロフィールを読み込み中…
          </p>
        ) : null}
      </header>

      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        {error ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <Card title="1. イベント情報（参照のみ）">
          <div>
            <label className={labelClass()} htmlFor="event_name">
              イベント名
            </label>
            <input
              id="event_name"
              className={inputClass(false)}
              readOnly
              value={values.event_name}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="event_date">
              開催日
            </label>
            <input
              id="event_date"
              className={inputClass(false)}
              readOnly
              value={values.event_date}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass()} htmlFor="event_id">
                イベントID
              </label>
              <input
                id="event_id"
                className={inputClass(false)}
                readOnly
                value={values.event_id}
              />
            </div>
            <div>
              <label className={labelClass()} htmlFor="line_id">
                LINE ID
              </label>
              <input
                id="line_id"
                className={inputClass(false)}
                readOnly
                value={values.line_id}
              />
            </div>
          </div>
        </Card>

        <Card title="2. 個人情報（編集可）">
          <div>
            <label className={labelClass()} htmlFor="name">
              お名前
            </label>
            <input
              id="name"
              className={inputClass(true)}
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="profile_url">
              プロフィールURL
            </label>
            <input
              id="profile_url"
              type="url"
              className={inputClass(true)}
              value={values.profile_url}
              onChange={(e) => update("profile_url", e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="hobby">
              趣味
            </label>
            <textarea
              id="hobby"
              className={`${inputClass(true)} min-h-[88px] resize-y`}
              value={values.hobby}
              onChange={(e) => update("hobby", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="self_pr">
              自己PR
            </label>
            <textarea
              id="self_pr"
              className={`${inputClass(true)} min-h-[120px] resize-y`}
              value={values.self_pr}
              onChange={(e) => update("self_pr", e.target.value)}
            />
          </div>
        </Card>

        <Card title="3. 仕事・交流（編集可）">
          <div>
            <label className={labelClass()} htmlFor="company_name_input">
              会社名
            </label>
            <input
              id="company_name_input"
              className={inputClass(true)}
              value={values.company_name_input}
              onChange={(e) =>
                update("company_name_input", e.target.value)
              }
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="job_title">
              役職
            </label>
            <input
              id="job_title"
              className={inputClass(true)}
              value={values.job_title}
              onChange={(e) => update("job_title", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="target_people">
              会いたい人・業界
            </label>
            <textarea
              id="target_people"
              className={`${inputClass(true)} min-h-[88px] resize-y`}
              value={values.target_people}
              onChange={(e) => update("target_people", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="ng_people">
              NGな人・避けたい話題
            </label>
            <textarea
              id="ng_people"
              className={`${inputClass(true)} min-h-[88px] resize-y`}
              value={values.ng_people}
              onChange={(e) => update("ng_people", e.target.value)}
            />
          </div>
        </Card>

        <Card title="4. AI分析（参照のみ）">
          <div className="rounded-xl border-l-4 border-violet-500 bg-violet-50/90 p-4 dark:border-violet-400 dark:bg-violet-950/40">
            <div>
              <label className={labelClass()} htmlFor="ai_summary">
                AIサマリー
              </label>
              <textarea
                id="ai_summary"
                className={`${inputClass(false)} mt-1 min-h-[120px] resize-y`}
                readOnly
                value={values.ai_summary}
              />
            </div>
            <div className="mt-4">
              <label className={labelClass()} htmlFor="tags">
                タグ
              </label>
              <textarea
                id="tags"
                className={`${inputClass(false)} mt-1 min-h-[72px] resize-y`}
                readOnly
                value={values.tags}
              />
            </div>
          </div>
        </Card>

        <Card title="5. お支払い・領収書">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass()} htmlFor="reception_number">
                受付番号 <span className="text-red-600">*</span>
              </label>
              <input
                id="reception_number"
                className={inputClass(true)}
                value={values.reception_number}
                onChange={(e) =>
                  update("reception_number", e.target.value)
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder="例: 1024"
              />
            </div>
            <div>
              <label className={labelClass()} htmlFor="payment_amount">
                支払い金額 <span className="text-red-600">*</span>
              </label>
              <input
                id="payment_amount"
                className={inputClass(true)}
                value={values.payment_amount}
                onChange={(e) =>
                  update("payment_amount", e.target.value)
                }
                inputMode="decimal"
                autoComplete="transaction-amount"
                placeholder="例: 5000"
              />
            </div>
          </div>
          <div>
            <label className={labelClass()} htmlFor="receipt_needed_display">
              領収書の希望
            </label>
            <input
              id="receipt_needed_display"
              className={inputClass(false)}
              readOnly
              value={receiptLabel}
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="receipt_name">
              領収書宛名
            </label>
            <input
              id="receipt_name"
              className={inputClass(false)}
              readOnly
              value={values.receipt_name}
            />
          </div>
        </Card>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || success}
            className="flex w-full items-center justify-center rounded-2xl bg-violet-600 px-4 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
          >
            {submitting ? "送信中..." : "参加登録を完了する"}
          </button>
        </div>
      </form>
    </div>
  );
}
