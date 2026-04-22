"use client";

import {useEffect, useState} from "react";
import {EditSheet} from "@/components/edit-sheet";
import {ServiceLabelHtmlEditor} from "@/components/service-label-html-editor";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch, type ApiOkResponse} from "@/lib/api";
import type {ContactMessageDoc} from "@/lib/profile-doc-types";

type Props = {
  open: boolean;
  row: ContactMessageDoc | null;
  /** Sujet initial (ex. « Re : … »), recalculé à l’ouverture. */
  initialSubject: string;
  onClose: () => void;
  /** Après envoi réussi (rechargement liste, etc.). */
  onSent: () => void;
};

/**
 * Feuille latérale : réponse e-mail (TinyMCE) + envoi via API SMTP.
 */
export function ContactReplySheet({
  open,
  row,
  initialSubject,
  onClose,
  onSent,
}: Props) {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("<p></p>");
  const [markHandled, setMarkHandled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && row) {
      setSubject(initialSubject);
      setHtmlBody("<p></p>");
      setMarkHandled(true);
      setError(null);
    }
  }, [open, row, initialSubject]);

  const send = async () => {
    if (!row) return;
    const token = await getIdToken();
    if (!token) {
      setError(t("errors.session"));
      return;
    }
    const sub = subject.trim();
    if (!sub) {
      setError(t("helpDesk.reply.errorSubject"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminFetch<ApiOkResponse>(
        `/admin/help-desk/contact-messages/${encodeURIComponent(row.id)}/send-reply`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            subject: sub,
            htmlBody,
            markHandled,
          }),
        },
      );
      onClose();
      onSent();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toEmail = row?.email?.trim() ?? "";

  return (
    <EditSheet
      open={open && !!row}
      title={t("helpDesk.reply.sheetTitle")}
      onClose={onClose}
      panelClassName="max-w-2xl"
      scrollableContent
      footer={
        <>
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={busy}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={busy || !toEmail}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            onClick={() => void send()}
          >
            {t("helpDesk.reply.send")}
          </button>
        </>
      }
    >
      {row ?
        <div className="space-y-4">
          {error ?
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          : null}

          <div>
            <label
              htmlFor="reply-to-email"
              className="text-xs font-medium uppercase tracking-wide text-gray-400"
            >
              {t("helpDesk.reply.fieldTo")}
            </label>
            <input
              id="reply-to-email"
              type="email"
              readOnly
              value={toEmail}
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-800"
            />
          </div>

          <div>
            <label
              htmlFor="reply-subject"
              className="text-xs font-medium uppercase tracking-wide text-gray-400"
            >
              {t("helpDesk.reply.fieldSubject")}
            </label>
            <input
              id="reply-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary/70 focus:ring-2 focus:ring-primary/15 focus:outline-none"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {t("helpDesk.reply.fieldBody")}
            </p>
            <div className="mt-1" key={row.id}>
              <ServiceLabelHtmlEditor
                value={htmlBody}
                onChange={setHtmlBody}
                disabled={busy}
                height={360}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={markHandled}
              onChange={(e) => setMarkHandled(e.target.checked)}
              disabled={busy}
            />
            {t("helpDesk.reply.markHandled")}
          </label>

          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <p className="font-medium text-gray-700">
              {t("helpDesk.reply.originalLabel")}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{row.message ?? "—"}</p>
          </div>
        </div>
      : null}
    </EditSheet>
  );
}
