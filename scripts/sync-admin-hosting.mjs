import {cpSync, existsSync, mkdirSync, rmSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const outDir = join(root, "admin", "out");
const nestedAdmin = join(outDir, "admin");
/** Next peut exporter soit `out/`, soit `out/admin/` selon la version. */
const source = existsSync(nestedAdmin) ? nestedAdmin : outDir;
const dest = join(root, "public", "admin");

if (!existsSync(source)) {
  console.error("Missing admin build output:", source);
  console.error("Run: npm --prefix admin run build");
  process.exit(1);
}

rmSync(dest, {recursive: true, force: true});
mkdirSync(join(root, "public"), {recursive: true});
cpSync(source, dest, {recursive: true});
console.log("Synced admin static export -> public/admin (from", source, ")");
