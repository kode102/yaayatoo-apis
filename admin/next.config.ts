import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {unoptimized: true},
  /** Évite l’avertissement « multiple lockfiles » (repo parent + admin). */
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
