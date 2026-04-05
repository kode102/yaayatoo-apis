"use client";

import {AuthProvider} from "@/contexts/auth-context";
import {EditorLocaleProvider} from "@/contexts/editor-locale-context";
import type {ReactNode} from "react";

export default function Providers({children}: {children: ReactNode}) {
  return (
    <AuthProvider>
      <EditorLocaleProvider>{children}</EditorLocaleProvider>
    </AuthProvider>
  );
}
