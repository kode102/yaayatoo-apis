"use client";

import {useCallback, useEffect, useState} from "react";
import {useAuth} from "@/contexts/auth-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import {EditSheet} from "@/components/edit-sheet";
import {adminFetch, type ApiDocResponse, type ApiListResponse} from "@/lib/api";
import {
  labelForLocale,
  pickSortLabel,
  type CountryDoc,
  type TranslationMap,
} from "@/lib/i18n-types";

function localeCount(tr: TranslationMap | undefined): number {
  if (!tr) return 0;
  return Object.keys(tr).filter((k) => tr[k]?.name?.trim()).length;
}

export default function CountriesPage() {
  const {getIdToken} = useAuth();
  const {editorLocale} = useEditorLocale();
  const [items, setItems] = useState<CountryDoc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [flagLink, setFlagLink] = useState("");
  const [activeNew, setActiveNew] = useState(true);

  const [editRow, setEditRow] = useState<CountryDoc | null>(null);
  const [editName, setEditName] = useState("");
  const [editFlag, setEditFlag] = useState("");

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoadError(null);
    try {
      const res = await adminFetch<ApiListResponse<CountryDoc>>(
        `/admin/documents/countries?sortLocale=${encodeURIComponent(editorLocale)}`,
        token,
      );
      setItems((res.data ?? []) as CountryDoc[]);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [getIdToken, editorLocale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRow(e: React.FormEvent) {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminFetch<ApiDocResponse<CountryDoc>>("/admin/documents/countries", token, {
        method: "POST",
        body: JSON.stringify({
          locale: editorLocale,
          name,
          code,
          flagLink,
          active: activeNew,
        }),
      });
      setName("");
      setCode("");
      setFlagLink("");
      setActiveNew(true);
      await load();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: CountryDoc) {
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminFetch<ApiDocResponse<CountryDoc>>(
        `/admin/documents/countries/${row.id}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({active: !row.active}),
        },
      );
      await load();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(id: string) {
    if (!confirm("Supprimer ce pays ?")) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminFetch(`/admin/documents/countries/${id}`, token, {
        method: "DELETE",
      });
      await load();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row: CountryDoc) {
    setEditRow(row);
    setEditName(labelForLocale(row.translations, editorLocale));
    setEditFlag(row.flagLink ?? "");
  }

  async function saveEdit() {
    if (!editRow) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminFetch<ApiDocResponse<CountryDoc>>(
        `/admin/documents/countries/${editRow.id}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            locale: editorLocale,
            name: editName.trim(),
            flagLink: editFlag,
          }),
        },
      );
      setEditRow(null);
      await load();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Pays</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Code ISO et drapeau communs ; nom du pays traduit par langue
          d&apos;édition.
        </p>
      </div>

      {loadError ?
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {loadError}
        </p>
      : null}

      <form
        onSubmit={(e) => void createRow(e)}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
      >
        <h2 className="text-sm font-medium text-zinc-300">
          Nouveau pays (
          <span className="text-blue-400">{editorLocale.toUpperCase()}</span>)
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder={`Nom du pays (${editorLocale.toUpperCase()}) *`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            required
          />
          <input
            placeholder="Code * (ex. FR)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            required
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={activeNew}
              onChange={(e) => setActiveNew(e.target.checked)}
            />
            Actif
          </label>
        </div>
        <input
          placeholder="Lien du drapeau (URL)"
          value={flagLink}
          onChange={(e) => setFlagLink(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium">Nom ({editorLocale})</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Drapeau</th>
              <th className="px-3 py-2 font-medium">Locales</th>
              <th className="px-3 py-2 font-medium">Actif</th>
              <th className="px-3 py-2 font-medium">Mis à jour</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.map((row) => (
              <tr key={row.id} className="text-zinc-200">
                <td className="px-3 py-2 font-medium">
                  {labelForLocale(row.translations, editorLocale) ||
                    pickSortLabel(row.translations, editorLocale, row.code)}
                </td>
                <td className="px-3 py-2 text-zinc-400">{row.code}</td>
                <td className="max-w-[200px] truncate px-3 py-2">
                  {row.flagLink ?
                    <a
                      href={row.flagLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      lien
                    </a>
                  : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {localeCount(row.translations)}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleActive(row)}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      row.active ?
                        "bg-emerald-950 text-emerald-300"
                      : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {row.active ? "Oui" : "Non"}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {row.updatedAt ?
                    new Date(row.updatedAt).toLocaleString("fr-FR")
                  : "—"}
                </td>
                <td className="space-x-2 px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openEdit(row)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeRow(row.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ?
          <p className="px-3 py-6 text-center text-sm text-zinc-500">
            Aucun document dans la collection{" "}
            <code className="text-zinc-400">countries</code>.
          </p>
        : null}
      </div>

      <EditSheet
        open={!!editRow}
        title={`Modifier le pays (${editorLocale.toUpperCase()})`}
        onClose={() => setEditRow(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditRow(null)}
              className="rounded-md border border-zinc-600 px-3 py-2 text-sm text-zinc-300"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={busy || !editName.trim()}
              onClick={() => void saveEdit()}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Enregistrer
            </button>
          </>
        }
      >
        <p className="text-xs text-zinc-500">
          Code ISO :{" "}
          <code className="text-zinc-400">{editRow?.code}</code>
        </p>
        <label className="block text-sm text-zinc-300">
          Nom du pays
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Lien du drapeau
          <input
            value={editFlag}
            onChange={(e) => setEditFlag(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
        </label>
      </EditSheet>
    </div>
  );
}
