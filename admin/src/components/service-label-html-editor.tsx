"use client";

import dynamic from "next/dynamic";
import {useId} from "react";

const TINYMCE_VER = "8.4.0";

const Editor = dynamic(
  async () => (await import("@tinymce/tinymce-react")).Editor,
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[280px] animate-pulse rounded-xl border border-gray-200 bg-gray-50"
        aria-hidden
      />
    ),
  },
);

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

/**
 * Éditeur riche TinyMCE pour le libellé HTML (chargement CDN, licence GPL).
 */
export function ServiceLabelHtmlEditor({value, onChange, disabled}: Props) {
  const base = `https://cdn.jsdelivr.net/npm/tinymce@${TINYMCE_VER}`;
  const uid = useId().replace(/:/g, "");
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <Editor
        id={`svc-label-html-${uid}`}
        licenseKey="gpl"
        tinymceScriptSrc={`${base}/tinymce.min.js`}
        value={value}
        onEditorChange={(html) => onChange(html)}
        disabled={disabled}
        init={{
          base_url: base,
          suffix: ".min",
          height: 300,
          menubar: false,
          branding: false,
          promotion: false,
          resize: true,
          plugins: "link lists autoresize code",
          toolbar:
            "undo redo | blocks | bold italic underline strikethrough | " +
            "link | bullist numlist | removeformat | code",
          content_style:
            "body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;}",
        }}
      />
    </div>
  );
}
