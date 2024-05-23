import { resolve, join as joinPath } from "node:path";
import { ChildProcess, spawn as spawnProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

function spawn(cmd, conf) {
    return spawnProcess(cmd, { ...conf, stdio: "inherit", shell: true });
}

async function main() {
    const corePath = resolve(process.env.INSTALL_PATH || "./supertokens-root");
    const authReactPath = resolve(process.env.INSTALL_PATH || "./supertokens-auth-react");
    const nodePath = resolve(process.env.INSTALL_PATH || "./supertokens-node");

    const nodeBranch = process.argv[2];
    const reactBranch = process.argv[3];

    for (const p of [corePath, authReactPath, nodePath]) {
        if (!existsSync(p)) {
            await join(spawn(`git clone git@github.com:supertokens/supertokens-auth-react.git ${p}`));
        }
    }
    console.log(`Testing with frontend auth-react: ${reactBranch}, node tag: ${nodeBranch}, local core`);

    await join(spawn(`git status`, { cwd: authReactPath }));
    await join(spawn(`git checkout ${reactBranch}`, { cwd: authReactPath }));

    await join(spawn(`npm run init`, { cwd: authReactPath }));
    await join(
        spawn(`npm i git+https://github.com:supertokens/supertokens-node.git#${nodeBranch}`, {
            cwd: joinPath(authReactPath, "test/server"),
        })
    );

    await join(spawn(`git checkout ${nodeBranch}`, { cwd: nodePath }));
    await join(spawn(`npm i`, { cwd: joinPath(nodePath, "test/auth-react-server") }));

    if (!existsSync(joinPath(nodePath, "test_report"))) {
        await mkdir(joinPath(nodePath, "test_report"));
    }
    const integrationServerProc = spawn(
        "DEBUG=com.supertokens TEST_MODE=testing node . >> ../../test_report/backend.log 2>&1",
        { cwd: joinPath(nodePath, "test/auth-react-server") }
    );

    await join(
        spawn("MOCHA_FILE=test_report/report_node.xml SKIP_OAUTH=true npm run test-with-non-node", {
            cwd: authReactPath,
        })
    );
    integrationServerProc.kill(9);
}

/*
cd ../project/test/auth-react-server
npm i
mkdir -p ../../test_report

echo "Testing with frontend auth-react: $2, node tag: $3, FREE core: $coreVersion, plugin-interface: $pluginInterfaceVersion" >> ../../test_report/backend.log
DEBUG=com.supertokens TEST_MODE=testing node . >> ../../test_report/backend.log 2>&1 &
pid=$!
cd ../../../supertokens-auth-react/

# This says non-node, but what it actually means is that we will
# be using the sever on this repo instead of the one in auth-react repo

# When testing with supertokens-auth-react for version >= 0.18 the SKIP_OAUTH 
# flag will not be checked because Auth0 is used as a provider so that the Thirdparty tests can run reliably. 
# In versions lower than 0.18 Github is used as the provider.

MOCHA_FILE=test_report/report_node.xml SKIP_OAUTH=true npm run test-with-non-node
if [[ $? -ne 0 ]]
then
    echo "test failed... exiting!"
    rm -rf ./test/server/node_modules/supertokens-node
    git checkout HEAD -- ./test/server/package.json
    kill -9 $pid
    exit 1
fi
rm -rf ./test/server/node_modules/supertokens-node
git checkout HEAD -- ./test/server/package.json
kill -9 $pid
*/

/**
 *
 * @param {ChildProcess} proc
 * @returns
 */
function join(proc) {
    return new Promise((res, rej) => proc.on("exit", (code) => (code === 0 ? res() : rej(code))));
}

main().then(
    () => process.exit(0),
    () => process.exit(1)
);
