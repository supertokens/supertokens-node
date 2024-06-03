const { printPath, getAllFilesInDirectory } = require("./utils");
const { resolve } = require("path");
const { writeFileSync, rmSync } = require("fs");
const { existsSync } = require("fs");
const { execSync } = require("child_process");

const testFileName = "importtest.js";
const testFilePath = resolve(process.cwd(), `./${testFileName}`);

describe(`importTests: ${printPath("[test/import.test.js]")}`, function () {
    after(function () {
        // The exists check is just a precaution
        if (existsSync(testFilePath)) {
            rmSync(testFilePath);
        }
    });

    /**
     * This test does the following:
     * 1. Gets a list of all files in the build folder recursively
     * 2. For each build file, creates a simple js file that imports the build file
     * 3. Runs the generated js file
     *
     * The test fails if there is any error thrown when trying to run any of the generated files.
     *
     * This is to prevent issues arising from circular imports where certain variables from the
     * default exports for recipes are not intialised correctly.
     * (Refer to: https://github.com/supertokens/supertokens-node/issues/513)
     */
    it("Test that importing all build files independently does not cause errors", function () {
        const fileNames = getAllFilesInDirectory(resolve(process.cwd(), "./lib/build")).filter(
            (i) => !i.endsWith(".d.ts") && !i.endsWith(".map")
        );

        fileNames.forEach((fileName) => {
            const relativeFilePath = fileName.replace(process.cwd(), "");
            writeFileSync(testFilePath, `require(".${relativeFilePath}")`);

            // This will throw an error if the command fails
            try {
                execSync(`node ${resolve(process.cwd(), `./${testFileName}`)}`);
            } catch (err) {
                console.log();
                console.log("failed for ", relativeFilePath);
                console.log();
                throw err;
            }
        });
    });
});
