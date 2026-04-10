"use client";

import {useRef, useState} from "react";
import {ensureFirebaseApp} from "@/lib/firebase";
import {
  SERVICE_IMAGE_MAX_BYTES,
  uploadEmployeeProfileImageToStorage,
} from "@/lib/storage-upload";
import {useUiLocale} from "@/contexts/ui-locale-context";

type Props = {
  value: string;
  onChange: (url: string) => void;
  employeeUid?: string;
  disabled?: boolean;
};

export function EmployeeProfileImageField({
  value,
  onChange,
  employeeUid,
  disabled,
}: Props) {
  const {t} = useUiLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLocalError(null);
    setUploading(true);
    try {
      await ensureFirebaseApp();
      const url = await uploadEmployeeProfileImageToStorage(file, {
        employeeUid,
      });
      onChange(url);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : String(err);
      if (code === "IMAGE_TOO_LARGE") {
        setLocalError(
          t("errors.imageTooLarge", {
            maxMb: String(Math.round(SERVICE_IMAGE_MAX_BYTES / (1024 * 1024))),
          }),
        );
      } else if (code === "IMAGE_TYPE") {
        setLocalError(t("errors.imageType"));
      } else {
        setLocalError(
          err instanceof Error ? err.message : t("errors.imageUploadFailed"),
        );
      }
    } finally {
      setUploading(false);
    }
  }

  const busy = Boolean(disabled || uploading);

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-gray-700">
        {t("users.employee.profileImage")}
      </span>
      <p className="text-xs text-gray-500">
        {t("services.image.hint", {
          maxMb: String(Math.round(SERVICE_IMAGE_MAX_BYTES / (1024 * 1024))),
        })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={busy}
          onChange={(e) => void onFileChange(e)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? t("services.image.uploading") : t("services.image.choose")}
        </button>
        {value.trim() ?
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL Firebase Storage */}
            <img
              src={value.trim()}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange("")}
              className="text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {t("services.image.remove")}
            </button>
          </>
        : null}
      </div>
      {localError ?
        <p className="text-sm text-red-600">{localError}</p>
      : null}
    </div>
  );
}
