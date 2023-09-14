/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
const { exec } = require("child_process");
let fs = require("fs");
let assert = require("assert");

module.exports.executeCommand = async function (cmd) {
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

module.exports.setupST = async function () {
    let installationPath = process.env.INSTALL_PATH;
    try {
        await module.exports.executeCommand("cd " + installationPath + " && cp temp/licenseKey ./licenseKey");
    } catch (ignored) {}
    await module.exports.executeCommand("cd " + installationPath + " && cp temp/config.yaml ./config.yaml");
};

module.exports.setKeyValueInConfig = async function (key, value) {
    return new Promise((resolve, reject) => {
        let installationPath = process.env.INSTALL_PATH;
        fs.readFile(installationPath + "/config.yaml", "utf8", function (err, data) {
            if (err) {
                reject(err);
                return;
            }
            let oldStr = new RegExp("((#\\s)?)" + key + "(:|((:\\s).+))\n");
            let newStr = key + ": " + value + "\n";
            let result = data.replace(oldStr, newStr);
            fs.writeFile(installationPath + "/config.yaml", result, "utf8", function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
};

module.exports.cleanST = async function () {
    let installationPath = process.env.INSTALL_PATH;
    try {
        await module.exports.executeCommand("cd " + installationPath + " && rm licenseKey");
    } catch (ignored) {}
    await module.exports.executeCommand("cd " + installationPath + " && rm config.yaml");
    await module.exports.executeCommand("cd " + installationPath + " && rm -rf .webserver-temp-*");
    await module.exports.executeCommand("cd " + installationPath + " && rm -rf .started");
};

module.exports.stopST = async function (pid) {
    let pidsBefore = await getListOfPids();
    if (pidsBefore.length === 0) {
        return;
    }
    await module.exports.executeCommand("kill " + pid);
    let startTime = Date.now();
    while (Date.now() - startTime < 10000) {
        let pidsAfter = await getListOfPids();
        if (pidsAfter.includes(pid)) {
            await new Promise((r) => setTimeout(r, 100));
            continue;
        } else {
            return;
        }
    }
    throw new Error("error while stopping ST with PID: " + pid);
};

module.exports.killAllST = async function () {
    let pids = await getListOfPids();
    for (let i = 0; i < pids.length; i++) {
        await module.exports.stopST(pids[i]);
    }
};

module.exports.startST = async function (config = {}) {
    const host = config.host ?? "localhost";
    const port = config.port ?? 9000;

    const notUsingTestApp =
        process.env.REAL_DB_TEST !== "true" || host !== "localhost" || port !== 9000 || config.noApp === true;
    if (config.coreConfig && notUsingTestApp) {
        for (const [k, v] of Object.entries(config.coreConfig)) {
            await module.exports.setKeyValueInConfig(k, v);
        }
    }

    return new Promise(async (resolve, reject) => {
        let installationPath = process.env.INSTALL_PATH;
        let pidsBefore = await getListOfPids();
        let returned = false;
        module.exports
            .executeCommand(
                "cd " +
                    installationPath +
                    ` && java -Djava.security.egd=file:/dev/urandom -classpath "./core/*:./plugin-interface/*" io.supertokens.Main ./ DEV host=` +
                    host +
                    " port=" +
                    port +
                    " test_mode"
            )
            .catch((err) => {
                if (!returned) {
                    returned = true;
                    reject(err);
                }
            });
        let startTime = Date.now();
        while (Date.now() - startTime < 10000) {
            let pidsAfter = await getListOfPids();
            if (pidsAfter.length <= pidsBefore.length) {
                await new Promise((r) => setTimeout(r, 100));
                continue;
            }
            let nonIntersection = pidsAfter.filter((x) => !pidsBefore.includes(x));
            if (nonIntersection.length !== 1) {
                if (!returned) {
                    returned = true;
                    reject("something went wrong while starting ST");
                }
            } else {
                if (!returned) {
                    returned = true;
                    console.log(`Application started on http://localhost:${process.env.NODE_PORT | 8080}`);
                    console.log(`processId: ${nonIntersection[0]}`);

                    if (notUsingTestApp) {
                        return resolve(`http://${host}:${port}`);
                    }

                    try {
                        // Math.random is an unsafe random but it doesn't actually matter here
                        // const appId = configs.appId ?? `testapp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                        const appId = config.appId ?? `testapp`;

                        await module.exports.removeAppAndTenants(host, port, appId);

                        const OPAQUE_KEY_WITH_MULTITENANCY_FEATURE =
                            "ijaleljUd2kU9XXWLiqFYv5br8nutTxbyBqWypQdv2N-BocoNriPrnYQd0NXPm8rVkeEocN9ayq0B7c3Pv-BTBIhAZSclXMlgyfXtlwAOJk=9BfESEleW6LyTov47dXu";

                        await fetch(`http://${host}:${port}/ee/license`, {
                            method: "PUT",
                            headers: {
                                "content-type": "application/json; charset=utf-8",
                            },
                            body: JSON.stringify({
                                licenseKey: OPAQUE_KEY_WITH_MULTITENANCY_FEATURE,
                            }),
                        });

                        // Create app
                        const createAppResp = await fetch(`http://${host}:${port}/recipe/multitenancy/app`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                appId,
                                emailPasswordEnabled: true,
                                thirdPartyEnabled: true,
                                passwordlessEnabled: true,
                                coreConfig: config.coreConfig,
                            }),
                        });
                        const respBody = await createAppResp.json();
                        assert.strictEqual(respBody.status, "OK");
                        resolve(`http://${host}:${port}/appid-${appId}`);
                    } catch (err) {
                        reject(err);
                    }
                }
            }
        }
        if (!returned) {
            returned = true;
            reject("could not start ST process");
        }
    });
};

module.exports.removeAppAndTenants = async function (host, port, appId) {
    const tenantsResp = await fetch(`http://${host}:${port}/appid-${appId}/recipe/multitenancy/tenant/list`);
    if (tenantsResp.status === 401) {
        const updateAppResp = await fetch(`http://${host}:${port}/recipe/multitenancy/app`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                appId,
                coreConfig: { api_keys: null },
            }),
        });
        assert.strictEqual(updateAppResp.status, 200);
        await module.exports.removeAppAndTenants(host, port, appId);
    } else if (tenantsResp.status === 200) {
        const tenants = (await tenantsResp.json()).tenants;
        for (const t of tenants) {
            if (t.tenantId !== "public") {
                await fetch(`http://${host}:${port}/appid-${appId}/recipe/multitenancy/tenant/remove`, {
                    method: "POST",
                    headers: {
                        "content-type": "application/json; charset=utf-8",
                    },
                    body: JSON.stringify({
                        tenantId: t.tenantId,
                    }),
                });
            }
        }

        const removeResp = await fetch(`http://${host}:${port}/recipe/multitenancy/app/remove`, {
            method: "POST",
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                appId,
            }),
        });
        const removeRespBody = await removeResp.json();
        assert.strictEqual(removeRespBody.status, "OK");
    }
};

const WEB_PORT = process.env.WEB_PORT || 3031;
const websiteDomain = `http://localhost:${WEB_PORT}`;
module.exports.mockThirdPartyProvider = {
    config: {
        name: "Mock Provider",
        thirdPartyId: "mock-provider",
        authorizationEndpoint: `${websiteDomain}/mockProvider/auth`,
        tokenEndpoint: `${websiteDomain}/mockProvider/token`,
        clients: [
            {
                clientId: "supertokens",
                clientSecret: "",
            },
        ],
    },
    override: (oI) => ({
        ...oI,
        exchangeAuthCodeForOAuthTokens: ({ redirectURIInfo }) => redirectURIInfo.redirectURIQueryParams,
        getUserInfo: ({ oAuthTokens }) => {
            return {
                thirdPartyUserId: oAuthTokens.userId ?? "user",
                email: {
                    id: oAuthTokens.email ?? "email@test.com",
                    isVerified: oAuthTokens.isVerified !== "false",
                },
                rawUserInfoFromProvider: {},
            };
        },
    }),
};
/**
 *
 * @returns {import("supertokens-node/lib/build/recipe/thirdparty/types").ProviderConfig}
 */
module.exports.customAuth0Provider = () => {
    return {
        config: {
            thirdPartyId: "auth0",
            name: "Auth0",
            // this contains info about forming the authorisation redirect URL without the state params and without the redirect_uri param
            authorizationEndpoint: `https://${process.env.AUTH0_DOMAIN}/authorize`,
            authorizationEndpointQueryParams: {
                scope: "openid profile",
            },
            tokenEndpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
            clients: [
                {
                    clientId: process.env.AUTH0_CLIENT_ID,
                    clientSecret: process.env.AUTH0_CLIENT_SECRET,
                },
            ],
        },
        override: (oI) => ({
            ...oI,
            getUserInfo: async (accessTokenAPIResponse) => {
                let accessToken = accessTokenAPIResponse.oAuthTokens.access_token;
                if (accessToken === undefined) {
                    throw new Error("access token is undefined");
                }
                // let authHeader = `Bearer ${accessToken}`;
                // let response = await axios({
                //     method: "get",
                //     url: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
                //     headers: {
                //         Authorization: authHeader,
                //     },
                // });
                // let userInfo = response.data;
                return {
                    thirdPartyUserId: "someId",
                    email: {
                        id: "test@example.com",
                        isVerified: true,
                    },
                };
            },
        }),
    };
};

async function getListOfPids() {
    let installationPath = process.env.INSTALL_PATH;
    let currList;
    try {
        currList = (await module.exports.executeCommand("cd " + installationPath + " && ls .started/")).stdout;
    } catch (err) {
        return [];
    }
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

module.exports.maxVersion = function (version1, version2) {
    let splittedv1 = version1.split(".");
    let splittedv2 = version2.split(".");
    let minLength = Math.min(splittedv1.length, splittedv2.length);
    for (let i = 0; i < minLength; i++) {
        let v1 = Number(splittedv1[i]);
        let v2 = Number(splittedv2[i]);
        if (v1 > v2) {
            return version1;
        } else if (v2 > v1) {
            return version2;
        }
    }
    if (splittedv1.length >= splittedv2.length) {
        return version1;
    }
    return version2;
};
