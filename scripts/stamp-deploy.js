const fs = require("fs");
const path = require("path");

const deployedAt = new Date().toISOString();
const commit = (process.env.COMMIT_REF || process.env.GITHUB_SHA || "").slice(0, 7);

const payload = { deployedAt };
if (commit) payload.commit = commit;

const out = path.join(__dirname, "..", "deploy.json");
fs.writeFileSync(out, `${JSON.stringify(payload)}\n`);
console.log("Wrote", out, payload);
