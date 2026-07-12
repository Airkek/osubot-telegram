import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourceRoot = path.resolve(import.meta.dirname, "..", "src");
const errors = [];

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const item = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(item) : item.endsWith(".ts") ? [item] : [];
    });
}

function isExported(node) {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function isDefaultExport(node) {
    return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);
}

for (const file of walk(sourceRoot)) {
    const relativeFile = path.relative(sourceRoot, file).replaceAll(path.sep, "/");
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const publicDeclarations = [];

    for (const statement of source.statements) {
        if (ts.isExportAssignment(statement) || isDefaultExport(statement)) {
            errors.push(`${relativeFile}: default exports are forbidden`);
        }
        if ((ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)) && isExported(statement)) {
            publicDeclarations.push(statement);
        }
    }

    if (publicDeclarations.length > 1) {
        errors.push(
            `${relativeFile}: exports more than one class/interface (${publicDeclarations
                .map((declaration) => declaration.name?.text ?? "anonymous")
                .join(", ")})`
        );
    }

    for (const declaration of publicDeclarations) {
        const name = declaration.name?.text;
        const filename = path.basename(file, ".ts");
        if (!name || name !== filename) {
            errors.push(`${relativeFile}: exported ${name ?? "anonymous declaration"} must match filename ${filename}`);
        }
        if (ts.isInterfaceDeclaration(declaration) && !name.startsWith("I")) {
            errors.push(`${relativeFile}: exported interface ${name} must use the I-prefix`);
        }
    }
}

if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
} else {
    console.log("Source layout check passed");
}
