import path from "node:path";

const buildRoot = path.resolve(__dirname, "..", "..");

export const runtimePaths = Object.freeze({
    assets: path.join(buildRoot, "assets"),
    locales: path.join(buildRoot, "src", "localization", "locales"),
    performanceContract: path.join(buildRoot, "contracts", "osubot", "performance", "v1", "performance.proto"),
});
