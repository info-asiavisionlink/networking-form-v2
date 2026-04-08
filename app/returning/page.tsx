import { Suspense } from "react";
import type { Metadata } from "next";
import { ReturningParticipantForm } from "./ReturningParticipantForm";

export const metadata: Metadata = {
  title: "参加登録（再訪）",
  description: "前回の情報を元に、再参加の登録を素早く完了できます。",
};

function FormFallback() {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-2xl items-center justify-center px-4 py-16 text-sm text-zinc-500">
      フォームを読み込み中…
    </div>
  );
}

export default function ReturningParticipantPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <ReturningParticipantForm />
    </Suspense>
  );
}
