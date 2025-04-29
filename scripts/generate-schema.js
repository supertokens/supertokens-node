// scripts/generate-schemas.js
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");

// Dynamic import for node-fetch because it’s an ESM module
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const coreJsonPath = path.join(__dirname, "..", "coreDriverInterfaceSupported.json");
const specsDir = path.join(__dirname, "..", "specs");
const libDir = path.join(__dirname, "..", "lib", "core");

const BASE_URL = "https://raw.githubusercontent.com/supertokens/core-driver-interface/refs/heads";

async function run() {
    const file = await fs.readFile(coreJsonPath, "utf-8");
    const json = JSON.parse(file);
    const versions = json.versions;

    console.log("📁 Creating specs directory...");
    await fs.mkdir(specsDir, { recursive: true });

    try {
        for (const version of versions) {
            const url = `${BASE_URL}/${version}/api_spec.yaml`;
            const specPath = path.join(specsDir, `api_spec_${version}.yaml`);

            console.log(`📥 Downloading: ${url}`);
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`❌ Failed to fetch ${url}: ${res.statusText}`);
                continue;
            }

            const specContent = await res.text();
            await fs.writeFile(specPath, specContent, "utf-8");
            console.log(`✅ Saved to ${specPath}`);
        }

        for (const version of versions) {
            const inputPath = path.join(specsDir, `api_spec_${version}.yaml`);
            const outputDir = path.join(libDir, version);
            const outputPath = path.join(outputDir, "schema.d.ts");

            await fs.mkdir(outputDir, { recursive: true });

            console.log(`🔧 Generating schema for version ${version}...`);
            await execPromise(`npx openapi-typescript ${inputPath} -o ${outputPath}`);

            // Post-process: remove `/appid-<something>/`
            console.log(`🧹 Cleaning appid from ${outputPath}`);
            let schemaContent = await fs.readFile(outputPath, "utf-8");
            schemaContent = schemaContent.replace(/\/appid-[^/]+/g, "");
            await fs.writeFile(outputPath, schemaContent, "utf-8");
            console.log(`✅ Cleaned ${outputPath}`);
        }
    } finally {
        console.log("🧹 Cleaning up specs directory...");
        await fs.rm(specsDir, { recursive: true, force: true });
        console.log("✅ Specs directory deleted.");
    }

    console.log("🎉 All done!");
}

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error: ${stderr}`);
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
}

run().catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
});
