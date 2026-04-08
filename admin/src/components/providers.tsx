"use client";

import {AuthProvider} from "@/contexts/auth-context";
import {EditorLocaleProvider} from "@/contexts/editor-locale-context";
import AdminDocumentLocale from "@/components/admin-document-locale";
import {UiLocaleProvider} from "@/contexts/ui-locale-context";
import type {ReactNode} from "react";

export default function Providers({children}: {children: ReactNode}) {
  return (
    <AuthProvider>
      <EditorLocaleProvider>
        <UiLocaleProvider>
          <AdminDocumentLocale />
          {children}
        </UiLocaleProvider>
      </EditorLocaleProvider>
    </AuthProvider>
  );
}
