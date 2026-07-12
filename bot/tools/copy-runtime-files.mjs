import fs from "node:fs";
import path from "node:path";

const botRoot = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(botRoot, "..");
const buildRoot = path.join(botRoot, "build");
const targets = {
    assets: [path.join(botRoot, "assets"), path.join(buildRoot, "assets")],
    locales: [
        path.join(botRoot, "src", "localization", "locales"),
        path.join(buildRoot, "src", "localization", "locales"),
    ],
    contracts: [path.join(repositoryRoot, "contracts"), path.join(buildRoot, "contracts")],
};

const requested = process.argv.slice(2);
if (requested.length !== 1 || !targets[requested[0]]) {
    throw new Error(`Expected one runtime file group: ${Object.keys(targets).join(", ")}`);
}

const [source, destination] = targets[requested[0]];
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.cpSync(source, destination, { recursive: true });
