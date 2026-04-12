"use client";

import {useCallback, useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {adminFetch} from "@/lib/api";

/**
 * Hook réutilisable pour dupliquer un document Firestore depuis n'importe
 * quelle vue liste admin.
 *
 * @param collection Nom de la collection Firestore (ex. "services").
 * @param onSuccess  Callback appelé après duplication réussie (ex. reload).
 */
export function useDuplicateRow(
  collection: string,
  onSuccess: () => void | Promise<void>,
) {
  const {getIdToken} = useAuth();
  const {t} = useUiLocale();
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const duplicateRow = useCallback(
    async (id: string) => {
      if (!confirm(t("common.duplicateConfirm"))) return;
      const token = await getIdToken();
      if (!token) {
        setDuplicateError(t("errors.session"));
        return;
      }
      setDuplicating(true);
      setDuplicateError(null);
      try {
        await adminFetch(
          `/admin/documents/${collection}/${id}/duplicate`,
          token,
          {method: "POST"},
        );
        await onSuccess();
      } catch (e: unknown) {
        setDuplicateError(e instanceof Error ? e.message : String(e));
      } finally {
        setDuplicating(false);
      }
    },
    [collection, getIdToken, onSuccess, t],
  );

  return {duplicateRow, duplicating, duplicateError};
}
