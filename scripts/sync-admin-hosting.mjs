import {cpSync, existsSync, mkdirSync, rmSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const outDir = join(root, "admin", "out");
const nestedAdmin = join(outDir, "admin");
/** Avec basePath Next, l’export peut être sous `out/admin/` ; sans basePath, directement `out/`. */
const source = existsSync(nestedAdmin) ? nestedAdmin : outDir;
const dest = join(root, "public");
const legacyAdminDir = join(dest, "admin");

if (!existsSync(source)) {
  console.error("Missing admin build output:", source);
  console.error("Run: npm --prefix admin run build");
  process.exit(1);
}

if (existsSync(legacyAdminDir)) {
  rmSync(legacyAdminDir, {recursive: true, force: true});
}
mkdirSync(dest, {recursive: true});
cpSync(source, dest, {recursive: true});
console.log("Synced admin static export -> public/ (from", source, ")");
