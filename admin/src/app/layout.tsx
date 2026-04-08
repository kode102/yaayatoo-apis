import type {Metadata, Viewport} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import AdminJsonLd from "@/components/admin-json-ld";
import Providers from "@/components/providers";
import {getAdminSiteUrl, getMetadataBase} from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getAdminSiteUrl();
const titleDefault = "Yaayatoo Admin";
const description =
  "Console d’administration Yaayatoo : gestion Firestore (services, pays, langues) et dictionnaire d’interface.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: titleDefault,
    template: "%s | Yaayatoo Admin",
  },
  description,
  applicationName: titleDefault,
  authors: [{name: "Yaayatoo"}],
  creator: "Yaayatoo",
  publisher: "Yaayatoo",
  keywords: [
    "Yaayatoo",
    "administration",
    "Firestore",
    "CMS",
    "services",
    "pays",
    "langues",
  ],
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    notranslate: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
      notranslate: true,
      nocache: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: titleDefault,
    title: titleDefault,
    description,
    images: [
      {
        url: "/image.png",
        width: 1200,
        height: 630,
        alt: "Yaayatoo Admin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: titleDefault,
    description,
    images: ["/image.png"],
  },
  appleWebApp: {
    capable: true,
    title: titleDefault,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [{url: "/favicon.ico", type: "image/x-icon"}],
    apple: [{url: "/favicon.ico", type: "image/x-icon"}],
    shortcut: ["/favicon.ico"],
  },
  /** Défaut FR ; `AdminDocumentLocale` bascule vers manifest-en selon l’interface. */
  manifest: "/manifest-fr.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    {media: "(prefers-color-scheme: light)", color: "#0266ff"},
    {media: "(prefers-color-scheme: dark)", color: "#001433"},
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AdminJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
