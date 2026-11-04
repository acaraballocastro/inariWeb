"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type BaseOptions = {
  title: string;
  /** Shown under the title; new lines are kept. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for what cancels, deletes or cannot be undone. */
  tone?: "default" | "danger";
};

export type ConfirmOptions = BaseOptions;

export type PromptOptions = BaseOptions & {
  label: string;
  placeholder?: string;
  /** The answer must be exactly this (e.g. a code typed to confirm a deletion). */
  expected?: string;
  /** An empty answer is allowed (false by default when `expected` is set). */
  optional?: boolean;
  multiline?: boolean;
};

type Request =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

type Dialogs = {
  /** Resolves true when confirmed, false when cancelled (button, Escape or backdrop). */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the text entered, or null when cancelled. */
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<Dialogs | null>(null);

/** The app's confirmations and prompts, in place of window.confirm and window.prompt. */
export function useDialogs() {
  const dialogs = useContext(DialogContext);
  if (!dialogs) throw new Error("useDialogs must be used inside DialogProvider");
  return dialogs;
}

/** Renders the dialog asked for with useDialogs; it goes once around the whole app (app/layout.tsx). */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ kind: "confirm", options, resolve })), []);
  const prompt = useCallback((options: PromptOptions) => new Promise<string | null>((resolve) => setRequest({ kind: "prompt", options, resolve })), []);
  const dialogs = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  function finish(answer: boolean | string | null) {
    if (!request) return;
    if (request.kind === "confirm") request.resolve(answer === true);
    else request.resolve(typeof answer === "string" ? answer : null);
    setRequest(null);
  }

  return (
    <DialogContext.Provider value={dialogs}>
      {children}
      {/* A new key per request starts every dialog empty. */}
      {request && <AppDialog key={request.options.title + (request.options.message ?? "")} request={request} onFinish={finish} />}
    </DialogContext.Provider>
  );
}

function AppDialog({ request, onFinish }: { request: Request; onFinish: (answer: boolean | string | null) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  const [text, setText] = useState("");
  const { options } = request;
  const isPrompt = request.kind === "prompt";
  const promptOptions = isPrompt ? (request.options as PromptOptions) : null;
  const danger = options.tone === "danger";

  // A modal <dialog>: the browser keeps the focus inside, puts it above
  // everything and makes the page behind inert; the focus goes back to where
  // it was when it closes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const answer = text.trim();
  const canConfirm = !promptOptions
    || (promptOptions.expected !== undefined ? answer === promptOptions.expected : promptOptions.optional || answer.length > 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canConfirm) return;
    onFinish(isPrompt ? answer : true);
  }

  const fieldClass = "mt-2 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[11px] text-[#292b26] outline-none focus:border-[#b5a786]";

  return (
    <dialog
      ref={dialogRef}
      role={danger ? "alertdialog" : "dialog"}
      aria-labelledby={titleId}
      aria-describedby={options.message ? messageId : undefined}
      // Escape.
      onCancel={(event) => { event.preventDefault(); onFinish(isPrompt ? null : false); }}
      // A click on the backdrop (outside the panel) cancels.
      onClick={(event) => { if (event.target === event.currentTarget) onFinish(isPrompt ? null : false); }}
      className="m-auto w-[calc(100%-32px)] max-w-[440px] border-0 bg-transparent p-0 text-[#292b26] backdrop:bg-[#292b26]/45"
    >
      <form onSubmit={submit} className="bg-white p-6 shadow-xl sm:p-7">
        <p className={`text-[9px] font-semibold tracking-[0.2em] ${danger ? "text-[#8a3b2c]" : "text-[#9b8353]"}`}>{danger ? "PLEASE CONFIRM" : "CONFIRM"}</p>
        <h2 id={titleId} className="mt-3 font-serif text-[22px] leading-tight tracking-[-0.02em]">{options.title}</h2>
        {options.message && <p id={messageId} className="mt-3 whitespace-pre-line text-[11px] leading-relaxed text-[#77786f]">{options.message}</p>}

        {promptOptions && (
          <label className="mt-5 block text-[10px] text-[#65665d]">
            {promptOptions.label}
            {promptOptions.multiline
              ? <textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder={promptOptions.placeholder} className={`${fieldClass} min-h-20 py-2`} />
              : <input autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder={promptOptions.placeholder} autoComplete="off" spellCheck={false} className={`${fieldClass} h-10`} />}
          </label>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* With nothing to type, the safe choice has the focus first. */}
          <button type="button" autoFocus={!isPrompt} onClick={() => onFinish(isPrompt ? null : false)} className="h-10 border border-[#deddd6] px-5 text-[10px] hover:bg-[#f8f7f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5a786]">{options.cancelLabel ?? "Cancel"}</button>
          <button type="submit" disabled={!canConfirm} className={`h-10 px-5 text-[10px] text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "bg-[#8a3b2c] hover:bg-[#73301f] focus-visible:outline-[#8a3b2c]" : "bg-[#292b26] hover:bg-[#41443b] focus-visible:outline-[#292b26]"}`}>{options.confirmLabel ?? "Confirm"}</button>
        </div>
      </form>
    </dialog>
  );
}
