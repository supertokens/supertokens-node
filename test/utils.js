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
const nock = require("nock");
const request = require("supertest");
let fs = require("fs");
const { default: fetch } = require("cross-fetch");
let SuperTokens = require("../lib/build/supertokens").default;
let SessionRecipe = require("../lib/build/recipe/session/recipe").default;
let AccountLinkingRecipe = require("../lib/build/recipe/accountlinking/recipe").default;
let ThirPartyRecipe = require("../lib/build/recipe/thirdparty/recipe").default;
let ThirPartyPasswordless = require("../lib/build/recipe/thirdpartypasswordless/recipe").default;
let ThirdPartyEmailPasswordRecipe = require("../lib/build/recipe/thirdpartyemailpassword/recipe").default;
let ThirdPartyPasswordlessRecipe = require("../lib/build/recipe/thirdpartypasswordless/recipe").default;
let EmailPasswordRecipe = require("../lib/build/recipe/emailpassword/recipe").default;
let DashboardRecipe = require("../lib/build/recipe/dashboard/recipe").default;
const EmailVerificationRecipe = require("../lib/build/recipe/emailverification/recipe").default;
let JWTRecipe = require("..//lib/build/recipe/jwt/recipe").default;
const UserMetadataRecipe = require("../lib/build/recipe/usermetadata/recipe").default;
let PasswordlessRecipe = require("..//lib/build/recipe/passwordless/recipe").default;
let MultitenancyRecipe = require("../lib/build/recipe/multitenancy/recipe").default;
const UserRolesRecipe = require("../lib/build/recipe/userroles/recipe").default;
let { ProcessState } = require("../lib/build/processState");
let { Querier } = require("../lib/build/querier");
let { maxVersion } = require("../lib/build/utils");
const { default: OpenIDRecipe } = require("../lib/build/recipe/openid/recipe");
const { wrapRequest } = require("../framework/express");
const { join } = require("path");

const users = require("./users.json");

module.exports.printPath = function (path) {
    return `${createFormat([consoleOptions.yellow, consoleOptions.italic, consoleOptions.dim])}${path}${createFormat([
        consoleOptions.default,
    ])}`;
};

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

module.exports.extractInfoFromResponse = function (res) {
    let antiCsrf = res.headers["anti-csrf"];
    let accessToken = undefined;
    let refreshToken = undefined;
    let accessTokenExpiry = undefined;
    let refreshTokenExpiry = undefined;
    let idRefreshTokenExpiry = undefined;
    let accessTokenDomain = undefined;
    let refreshTokenDomain = undefined;
    let idRefreshTokenDomain = undefined;
    let accessTokenHttpOnly = false;
    let idRefreshTokenHttpOnly = false;
    let refreshTokenHttpOnly = false;
    let frontToken = res.headers["front-token"];
    let cookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
    cookies = cookies === undefined ? [] : cookies;
    if (!Array.isArray(cookies)) {
        cookies = [cookies];
    }

    cookies.forEach((i) => {
        if (i.split(";")[0].split("=")[0] === "sAccessToken") {
            /**
             * if token is sAccessToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsInZlcnNpb24iOiIyIn0=.eyJzZXNzaW9uSGFuZGxlIjoiMWI4NDBhOTAtMjVmYy00ZjQ4LWE2YWMtMDc0MDIzZjNjZjQwIiwidXNlcklkIjoiIiwicmVmcmVzaFRva2VuSGFzaDEiOiJjYWNhZDNlMGNhMDVkNzRlNWYzNTc4NmFlMGQ2MzJjNDhmMTg1YmZmNmUxNThjN2I2OThkZDYwMzA1NzAyYzI0IiwidXNlckRhdGEiOnt9LCJhbnRpQ3NyZlRva2VuIjoiYTA2MjRjYWItZmIwNy00NTFlLWJmOTYtNWQ3YzU2MjMwZTE4IiwiZXhwaXJ5VGltZSI6MTYyNjUxMjM3NDU4NiwidGltZUNyZWF0ZWQiOjE2MjY1MDg3NzQ1ODYsImxtcnQiOjE2MjY1MDg3NzQ1ODZ9.f1sCkjt0OduS6I6FBQDBLV5zhHXpCU2GXnbe+8OCU6HKG00TX5CM8AyFlOlqzSHABZ7jES/+5k0Ff/rdD34cczlNqICcC4a23AjJg2a097rFrh8/8V7J5fr4UrHLIM4ojZNFz1NyVyDK/ooE6I7soHshEtEVr2XsnJ4q3d+fYs2wwx97PIT82hfHqgbRAzvlv952GYt+OH4bWQE4vTzDqGN7N2OKpn9l2fiCB1Ytzr3ocHRqKuQ8f6xW1n575Q1sSs9F9TtD7lrKfFQH+//6lyKFe2Q1SDc7YU4pE5Cy9Kc/LiqiTU+gsGIJL5qtMzUTG4lX38ugF4QDyNjDBMqCKw==; Max-Age=3599; Expires=Sat, 17 Jul 2021 08:59:34 GMT; Secure; HttpOnly; SameSite=Lax; Path=/'
             * i.split(";")[0].split("=")[1] will result in eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsInZlcnNpb24iOiIyIn0
             */
            accessToken = decodeURIComponent(i.split(";")[0].split("=").slice(1).join("="));
            if (i.split(";")[2].includes("Expires=")) {
                accessTokenExpiry = i.split(";")[2].split("=")[1];
            } else if (i.split(";")[2].includes("expires=")) {
                accessTokenExpiry = i.split(";")[2].split("=")[1];
            } else {
                accessTokenExpiry = i.split(";")[3].split("=")[1];
            }
            if (i.split(";")[1].includes("Domain=")) {
                accessTokenDomain = i.split(";")[1].split("=")[1];
            }
            accessTokenHttpOnly = i.split(";").findIndex((j) => j.includes("HttpOnly")) !== -1;
        } else if (i.split(";")[0].split("=")[0] === "sRefreshToken") {
            refreshToken = i.split(";")[0].split("=").slice(1).join("=");
            if (i.split(";")[2].includes("Expires=")) {
                refreshTokenExpiry = i.split(";")[2].split("=")[1];
            } else if (i.split(";")[2].includes("expires=")) {
                refreshTokenExpiry = i.split(";")[2].split("=")[1];
            } else {
                refreshTokenExpiry = i.split(";")[3].split("=")[1];
            }
            if (i.split(";")[1].includes("Domain=")) {
                refreshTokenDomain = i.split(";")[1].split("=").slice(1).join("=");
            }
            refreshTokenHttpOnly = i.split(";").findIndex((j) => j.includes("HttpOnly")) !== -1;
        }
    });

    const refreshTokenFromHeader = res.headers["st-refresh-token"];
    const accessTokenFromHeader = res.headers["st-access-token"];

    const accessTokenFromAny = accessToken === undefined ? accessTokenFromHeader : accessToken;
    const refreshTokenFromAny = refreshToken === undefined ? refreshTokenFromHeader : refreshToken;

    return {
        status: res.status || res.statusCode,
        body: res.body,
        antiCsrf,
        accessToken,
        refreshToken,
        accessTokenFromHeader,
        refreshTokenFromHeader,
        accessTokenFromAny,
        refreshTokenFromAny,
        accessTokenExpiry,
        refreshTokenExpiry,
        idRefreshTokenExpiry,
        accessTokenDomain,
        refreshTokenDomain,
        idRefreshTokenDomain,
        frontToken,
        accessTokenHttpOnly,
        refreshTokenHttpOnly,
        idRefreshTokenHttpOnly,
    };
};

module.exports.extractCookieCountInfo = function (res) {
    let accessToken = 0;
    let refreshToken = 0;
    let idRefreshToken = 0;
    let cookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
    cookies = cookies === undefined ? [] : cookies;
    if (!Array.isArray(cookies)) {
        cookies = [cookies];
    }
    cookies.forEach((i) => {
        if (i.split(";")[0].split("=")[0] === "sAccessToken") {
            accessToken += 1;
        } else if (i.split(";")[0].split("=")[0] === "sRefreshToken") {
            refreshToken += 1;
        } else {
            idRefreshToken += 1;
        }
    });
    return {
        accessToken,
        refreshToken,
        idRefreshToken,
    };
};

module.exports.setupST = async function () {
    let installationPath = process.env.INSTALL_PATH;
    try {
        await module.exports.executeCommand("cd " + installationPath + " && cp temp/licenseKey ./licenseKey");
    } catch (ignore) {}
    await module.exports.executeCommand("cd " + installationPath + " && cp temp/config.yaml ./config.yaml");
};

module.exports.cleanST = async function () {
    let installationPath = process.env.INSTALL_PATH;
    try {
        await module.exports.executeCommand("cd " + installationPath + " && rm licenseKey");
    } catch (ignore) {}
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

module.exports.resetAll = function () {
    SuperTokens.reset();
    AccountLinkingRecipe.reset();
    SessionRecipe.reset();
    ThirdPartyPasswordlessRecipe.reset();
    ThirdPartyEmailPasswordRecipe.reset();
    ThirPartyPasswordless.reset();
    EmailPasswordRecipe.reset();
    ThirPartyRecipe.reset();
    EmailVerificationRecipe.reset();
    JWTRecipe.reset();
    UserMetadataRecipe.reset();
    UserRolesRecipe.reset();
    PasswordlessRecipe.reset();
    OpenIDRecipe.reset();
    DashboardRecipe.reset();
    ProcessState.getInstance().reset();
    MultitenancyRecipe.reset();
};

module.exports.killAllST = async function () {
    let pids = await getListOfPids();
    for (let i = 0; i < pids.length; i++) {
        await module.exports.stopST(pids[i]);
    }
    module.exports.resetAll();
    nock.cleanAll();
};

module.exports.killAllSTCoresOnly = async function () {
    let pids = await getListOfPids();
    for (let i = 0; i < pids.length; i++) {
        await module.exports.stopST(pids[i]);
    }
};

module.exports.startST = async function (host = "localhost", port = 8080) {
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
        while (Date.now() - startTime < 30000) {
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

module.exports.startSTWithMultitenancy = async function (host = "localhost", port = 8080) {
    await module.exports.startST(host, port);
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
};

module.exports.removeAppAndTenants = async function (appId) {
    const tenantsResp = await fetch(`http://localhost:8080/appid-${appId}/recipe/multitenancy/tenant/list`);
    if (tenantsResp.status === 200) {
        const tenants = (await tenantsResp.json()).tenants;
        for (const t of tenants) {
            if (t.tenantId !== "public") {
                await fetch(`http://localhost:8080/appid-${appId}/recipe/multitenancy/tenant/remove`, {
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
        await fetch(`http://localhost:8080/recipe/multitenancy/app/remove`, {
            method: "POST",
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
                appId: `${appId}`,
            }),
        });
    }
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
            pid = pid.split("\n")[0];
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
    cyan: 36,
};

module.exports.signUPRequest = async function (app, email, password) {
    return new Promise(function (resolve) {
        request(app)
            .post("/auth/signup")
            .set("st-auth-mode", "cookie")
            .send({
                formFields: [
                    {
                        id: "password",
                        value: password,
                    },
                    {
                        id: "email",
                        value: email,
                    },
                ],
            })
            .end((err, res) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(res);
                }
            });
    });
};

module.exports.signUPRequestEmptyJSON = async function (app) {
    return new Promise(function (resolve) {
        request(app)
            .post("/auth/signup")
            .send({})
            .end((err, res) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(res);
                }
            });
    });
};

module.exports.signUPRequestNoBody = async function (app) {
    return new Promise(function (resolve) {
        request(app)
            .post("/auth/signup")
            .end((err, res) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(res);
                }
            });
    });
};

module.exports.signInUPCustomRequest = async function (app, email, id) {
    nock("https://test.com").post("/oauth/token").reply(200, {
        id,
        email,
    });
    return new Promise(function (resolve) {
        request(app)
            .post("/auth/signinup")
            .send({
                thirdPartyId: "custom",
                redirectURIInfo: {
                    redirectURIOnProviderDashboard: "http://127.0.0.1/callback",
                    redirectURIQueryParams: {
                        code: "abcdefghj",
                    },
                },
            })
            .end((err, res) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(res);
                }
            });
    });
};

module.exports.emailVerifyTokenRequest = async function (app, accessToken, antiCsrf, userId) {
    let result = await new Promise(function (resolve) {
        request(app)
            .post("/auth/user/email/verify/token")
            .set("Cookie", ["sAccessToken=" + accessToken])
            .set("anti-csrf", antiCsrf)
            .send({
                userId,
            })
            .end((err, res) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(res);
                }
            });
    });

    // wait for the callback to be called...
    await new Promise((res) => setTimeout(res, 500));

    return result;
};

module.exports.mockLambdaProxyEvent = function (path, httpMethod, headers, body, proxy) {
    return {
        path,
        httpMethod,
        headers,
        body,
        requestContext: {
            path: `${proxy}${path}`,
        },
    };
};

module.exports.mockLambdaProxyEventV2 = function (path, httpMethod, headers, body, proxy, cookies, queryParams) {
    return {
        version: "2.0",
        httpMethod,
        headers,
        body,
        cookies,
        requestContext: {
            http: {
                path: `${proxy}${path}`,
            },
            stage: proxy.slice(1),
        },
        queryStringParameters: queryParams,
    };
};

module.exports.isCDIVersionCompatible = async function (compatibleCDIVersion) {
    let currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion();

    if (
        maxVersion(currCDIVersion, compatibleCDIVersion) === compatibleCDIVersion &&
        currCDIVersion !== compatibleCDIVersion
    ) {
        return false;
    }
    return true;
};

module.exports.generateRandomCode = function (size) {
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    let randomString = "";

    //loop to select a new character in each iteration
    for (let i = 0; i < size; i++) {
        let randdomNumber = Math.floor(Math.random() * characters.length);
        randomString += characters.substring(randdomNumber, randdomNumber + 1);
    }
    return randomString;
};
module.exports.delay = async function (time) {
    await new Promise((r) => setTimeout(r, time * 1000));
};

module.exports.areArraysEqual = function (arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }

    arr1.sort();
    arr2.sort();

    for (let index in arr1) {
        if (arr1[index] !== arr2[index]) {
            return false;
        }
    }

    return true;
};

/**
 *
 * @returns {import("express").Response}
 */
module.exports.mockResponse = () => {
    const headers = {};
    const res = {
        getHeaders: () => headers,
        getHeader: (key) => headers[key],
        setHeader: (key, val) => (headers[key] = val),
    };
    return res;
};

/**
 *
 * @returns {import("express").Request}
 */
module.exports.mockRequest = () => {
    const headers = {};
    const req = {
        headers,
        get: (key) => headers[key],
        header: (key) => headers[key],
    };
    return req;
};

module.exports.getAllFilesInDirectory = (path) => {
    return fs
        .readdirSync(path, {
            withFileTypes: true,
        })
        .flatMap((file) => {
            if (file.isDirectory()) {
                return this.getAllFilesInDirectory(join(path, file.name));
            } else {
                return join(path, file.name);
            }
        });
};

module.exports.createUsers = async (emailpassword = null, passwordless = null, thirdparty = null) => {
    const usersArray = users.users;
    for (let i = 0; i < usersArray.length; i++) {
        const user = usersArray[i];
        if (user.recipe === "emailpassword" && emailpassword !== null) {
            await emailpassword.signUp("public", user.email, user.password);
        }
        if (user.recipe === "passwordless" && passwordless !== null) {
            if (user.email !== undefined) {
                const codeResponse = await passwordless.createCode({
                    tenantId: "public",
                    email: user.email,
                });
                await passwordless.consumeCode({
                    tenantId: "public",
                    preAuthSessionId: codeResponse.preAuthSessionId,
                    deviceId: codeResponse.deviceId,
                    userInputCode: codeResponse.userInputCode,
                });
            } else {
                const codeResponse = await passwordless.createCode({
                    tenantId: "public",
                    phoneNumber: user.phone,
                });
                await passwordless.consumeCode({
                    tenantId: "public",
                    preAuthSessionId: codeResponse.preAuthSessionId,
                    deviceId: codeResponse.deviceId,
                    userInputCode: codeResponse.userInputCode,
                });
            }
        }

        if (user.recipe === "thirdparty" && thirdparty !== null) {
            await thirdparty.manuallyCreateOrUpdateUser("public", user.provider, user.userId, user.email);
        }
    }
};
