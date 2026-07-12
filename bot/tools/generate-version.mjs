import fs from "node:fs";
import path from "node:path";

const botRoot = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(botRoot, "package.json"), "utf8"));
const target = path.join(botRoot, "src", "version.ts");

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `export const PACKAGE_VERSION = ${JSON.stringify(packageJson.version)};\n`, "utf8");
