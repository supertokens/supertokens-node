const { exec } = require("child_process");

module.exports.printPath = function(path) {
    return `${createFormat([consoleOptions.yellow, consoleOptions.italic, consoleOptions.dim])}${path}${createFormat([
        consoleOptions.default
    ])}`;
};

module.exports.executeCommand = async function(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
};

module.exports.setupST = async function() {
    let installationPath = process.env.INSTALL_PATH;
    await module.exports.executeCommand("cd " + installationPath + " && cp temp/licenseKey ./licenseKey");
    await module.exports.executeCommand("cd " + installationPath + " && cp temp/config.yaml ./config.yaml");
};

module.exports.cleanST = async function() {
    let installationPath = process.env.INSTALL_PATH;
    await module.exports.executeCommand("cd " + installationPath + " && rm licenseKey");
    await module.exports.executeCommand("cd " + installationPath + " && rm config.yaml");
    await module.exports.executeCommand("cd " + installationPath + " && rm -rf .webserver-temp-*");
    await module.exports.executeCommand("cd " + installationPath + " && rm -rf .started");
};

module.exports.stopST = async function(pid) {
    let pidsBefore = await getListOfPids();
    if (pidsBefore.length === 0) {
        return;
    }
    await module.exports.executeCommand("kill " + pid);
    startTime = Date.now();
    while (Date.now() - startTime < 10000) {
        let pidsAfter = await getListOfPids();
        if (pidsAfter.length !== pidsBefore.length - 1) {
            await new Promise(r => setTimeout(r, 100));
            continue;
        } else {
            return;
        }
    }
    throw new Error("error while stopping ST with PID: " + pid);
};

module.exports.killAllST = async function() {
    let pids = await getListOfPids();
    for (let i = 0; i < pids.length; i++) {
        await module.exports.stopST(pids[i]);
    }
};

module.exports.startST = async function() {
    return new Promise(async (resolve, reject) => {
        let installationPath = process.env.INSTALL_PATH;
        let pidsBefore = await getListOfPids();
        let returned = false;
        module.exports
            .executeCommand(
                "cd " +
                    installationPath +
                    ` && java -classpath "./core/*:./plugin-interface/*" io.supertokens.Main ./ DEV`
            )
            .catch(err => {
                if (!returned) {
                    returned = true;
                    reject(err);
                }
            });
        startTime = Date.now();
        while (Date.now() - startTime < 10000) {
            let pidsAfter = await getListOfPids();
            if (pidsAfter.length <= pidsBefore.length) {
                await new Promise(r => setTimeout(r, 100));
                continue;
            }
            let nonIntersection = pidsAfter.filter(x => !pidsBefore.includes(x));
            if (nonIntersection.length !== 1) {
                if (!returned) {
                    returned = true;
                    reject("something went wrong while starting ST");
                }
            } else {
                if (!returned) {
                    returned = true;
                    resolve(nonIntersection[0]);
                }
            }
        }
        if (!returned) {
            returned = true;
            reject("could not start ST process");
        }
    });
};

async function getListOfPids() {
    let installationPath = process.env.INSTALL_PATH;
    try {
        await module.exports.executeCommand("cd " + installationPath + " && ls .started/");
    } catch (err) {
        return [];
    }
    let currList = (await module.exports.executeCommand("cd " + installationPath + " && ls .started/")).stdout;
    currList = currList.split("\n");
    let result = [];
    for (let i = 0; i < currList.length; i++) {
        let item = currList[i];
        if (item === "") {
            continue;
        }
        try {
            let pid = (await module.exports.executeCommand("cd " + installationPath + " && cat .started/" + item))
                .stdout;
            result.push(pid);
        } catch (err) {}
    }
    return result;
}

function createFormat(options) {
    if (options.length === 0) {
        return ``;
    }
    let format = `\x1b[`;
    for (let i = 0; i < options.length; i++) {
        format += options[i];
        if (i !== options.length - 1) {
            format += `;`;
        }
    }
    format += `m`;
    return format;
}

const consoleOptions = {
    default: 0,
    bold: 1,
    dim: 2,
    italic: 3,
    underline: 4,
    blink: 5,
    white: 29,
    black: 30,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    purple: 35,
    cyan: 36
};
