// Verification server: normal owned startup/cleanup plus the unified map bundle.
process.argv.push("--maps");
await import("./serve.mjs");
