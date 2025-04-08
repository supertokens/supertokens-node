/* Copyright (c) 2025, VRAI Labs and/or its affiliates. All rights reserved.
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
let ThirdPartyRecipe = require("../lib/build/recipe/thirdparty/recipe").default;
let EmailPasswordRecipe = require("../lib/build/recipe/emailpassword/recipe").default;
let DashboardRecipe = require("../lib/build/recipe/dashboard/recipe").default;
let TotpRecipe = require("../lib/build/recipe/totp/recipe").default;
const EmailVerificationRecipe = require("../lib/build/recipe/emailverification/recipe").default;
let JWTRecipe = require("..//lib/build/recipe/jwt/recipe").default;
const UserMetadataRecipe = require("../lib/build/recipe/usermetadata/recipe").default;
let PasswordlessRecipe = require("..//lib/build/recipe/passwordless/recipe").default;
let MultitenancyRecipe = require("../lib/build/recipe/multitenancy/recipe").default;
let MultiFactorAuthRecipe = require("../lib/build/recipe/multifactorauth/recipe").default;
const UserRolesRecipe = require("../lib/build/recipe/userroles/recipe").default;
const OAuth2Recipe = require("../lib/build/recipe/oauth2provider/recipe").default;
const WebAuthnRecipe = require("../lib/build/recipe/webauthn/recipe").default;
let { ProcessState } = require("../lib/build/processState");
let { Querier } = require("../lib/build/querier");
let { maxVersion } = require("../lib/build/utils");
const { default: OpenIDRecipe } = require("../lib/build/recipe/openid/recipe");
const { wrapRequest } = require("../framework/express");
const { join } = require("path");
let debug = require("debug");
const { randomUUID } = require("node:crypto");
const setCookieParser = require("set-cookie-parser");

const users = require("./users.json");
let assert = require("assert");
const { CollectingResponse } = require("../framework/custom");

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

module.exports.extractInfoFromResponse = function (res) {
    let headers;
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

    let cookies = [];
    if (res instanceof CollectingResponse) {
        headers = Object.fromEntries(res.headers.entries());
        cookies = res.cookies;
    } else if (res) {
        headers = res.headers;
        cookies = res.headers["set-cookie"] || res.headers["Set-Cookie"];
        cookies = cookies === undefined ? [] : cookies;
        if (!Array.isArray(cookies)) {
            cookies = [cookies];
        }

        cookies = cookies
            .flat() // Ensure we have a flat array of cookies
            // Split cookie strings into arrays
            .map((cookieStr) => setCookieParser.splitCookiesString(cookieStr))
            .flat() // Since we have an array of arrays now
            // `parse` the cookies
            .map(setCookieParser.parseString);
    }
    // `CollectingResponse` objects use `key`, `set-cookie-parser` objects use `name`
    const accessTokenCookie = cookies.find((info) => (info?.key ?? info?.name) == "sAccessToken");
    if (accessTokenCookie) {
        accessToken = accessTokenCookie?.value;
        accessTokenExpiry = new Date(accessTokenCookie.expires).toUTCString();
        accessTokenDomain = accessTokenCookie.domain;
        accessTokenHttpOnly = accessTokenCookie.httpOnly;
    }
    const refreshTokenCookie = cookies.find((info) => (info?.key ?? info?.name) === "sRefreshToken");
    if (refreshTokenCookie) {
        refreshToken = refreshTokenCookie?.value;
        refreshTokenExpiry = new Date(refreshTokenCookie.expires).toUTCString();
        refreshTokenDomain = refreshTokenCookie.domain;
        refreshTokenHttpOnly = refreshTokenCookie.httpOnly;
    }

    let antiCsrf = headers["anti-csrf"];
    let frontToken = headers["front-token"];

    const refreshTokenFromHeader = headers["st-refresh-token"];
    const accessTokenFromHeader = headers["st-access-token"];

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

module.exports.resetAll = function (disableLogging = true) {
    SuperTokens.reset();
    AccountLinkingRecipe.reset();
    SessionRecipe.reset();
    EmailPasswordRecipe.reset();
    ThirdPartyRecipe.reset();
    EmailVerificationRecipe.reset();
    JWTRecipe.reset();
    UserMetadataRecipe.reset();
    UserRolesRecipe.reset();
    PasswordlessRecipe.reset();
    OpenIDRecipe.reset();
    DashboardRecipe.reset();
    ProcessState.getInstance().reset();
    MultitenancyRecipe.reset();
    TotpRecipe.reset();
    MultiFactorAuthRecipe.reset();
    OAuth2Recipe.reset();
    WebAuthnRecipe.reset();
    if (disableLogging) {
        debug.disable();
    }
};

// todo remove this
module.exports.killAllST = async function () {
    let pids = await getListOfPids();
    for (let i = 0; i < pids.length; i++) {
        await module.exports.stopST(pids[i]);
    }
    module.exports.resetAll();
    nock.cleanAll();
};

// todo remove this
module.exports.killAllSTCoresOnly = async function () {
    let pids = await getListOfPids();
    for (let i = 0; i < pids.length; i++) {
        await module.exports.stopST(pids[i]);
    }
};

module.exports.getCoreUrl = () => {
    const host = process.env?.SUPERTOKENS_CORE_HOST ?? "localhost";
    const port = process.env?.SUPERTOKENS_CORE_PORT ?? "3567";

    const coreUrl = `http://${host}:${port}`;

    return coreUrl;
};

module.exports.getCoreUrlFromConnectionURI = (connectionURI) => {
    let coreUrl = connectionURI;

    if (coreUrl.includes("appid-")) {
        coreUrl = connectionURI.split("appid-")[0];
    }

    if (coreUrl.endsWith("/")) {
        coreUrl = coreUrl.slice(0, -1);
    }

    return coreUrl;
};

module.exports.createCoreApplication = async function ({ appId, coreConfig } = {}) {
    const coreUrl = module.exports.getCoreUrl();

    if (!appId) {
        appId = randomUUID();
    }

    if (!coreConfig) {
        coreConfig = {};
    } else {
    }

    const createAppResp = await fetch(`${coreUrl}/recipe/multitenancy/app/v2`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            appId,
            coreConfig,
        }),
    });

    const respBody = await createAppResp.json();
    assert.strictEqual(respBody.status, "OK");
    assert.strictEqual(respBody.createdNew, true);

    return `${coreUrl}/appid-${appId}`;
};

module.exports.getAppIdFromConnectionURI = function (connectionURI) {
    return connectionURI.split("/").pop().split("-").pop();
};

module.exports.removeCoreApplication = async function ({ connectionURI } = {}) {
    const coreUrl = module.exports.getCoreUrl();

    const appId = module.exports.getAppIdFromConnectionURI(connectionURI);

    const createAppResp = await fetch(`${coreUrl}/recipe/multitenancy/app/remove`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            appId,
        }),
    });

    const respBody = await createAppResp.json();
    assert.strictEqual(respBody.status, "OK");

    return true;
};

module.exports.createCoreApplicationWithMultitenancy = async function (config) {
    const connectionURI = await module.exports.createCoreApplication(config);
    const OPAQUE_KEY_WITH_MULTITENANCY_FEATURE =
        "ijaleljUd2kU9XXWLiqFYv5br8nutTxbyBqWypQdv2N-BocoNriPrnYQd0NXPm8rVkeEocN9ayq0B7c3Pv-BTBIhAZSclXMlgyfXtlwAOJk=9BfESEleW6LyTov47dXu";

    await fetch(`${connectionURI}/ee/license`, {
        method: "PUT",
        headers: {
            "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
            licenseKey: OPAQUE_KEY_WITH_MULTITENANCY_FEATURE,
        }),
    });
    return connectionURI;
};

module.exports.createCoreApplicationWithMultitenancyAndAccountLinking = async function (config) {
    const connectionURI = await module.exports.createCoreApplication(config);

    const OPAQUE_KEY_WITH_FEATURES =
        "N2yITHflaFS4BPm7n0bnfFCjP4sJoTERmP0J=kXQ5YONtALeGnfOOe2rf2QZ0mfOh0aO3pBqfF-S0jb0ABpat6pySluTpJO6jieD6tzUOR1HrGjJO=50Ob3mHi21tQHJ";

    await fetch(`${connectionURI}/ee/license`, {
        method: "PUT",
        headers: {
            "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
            licenseKey: OPAQUE_KEY_WITH_FEATURES,
        }),
    });

    return connectionURI;
};

module.exports.removeAppAndTenants = async function (appId) {
    const tenantsResp = await fetch(`http://localhost:8080/appid-${appId}/recipe/multitenancy/tenant/list/v2`);
    if (tenantsResp.status === 401) {
        const updateAppResp = await fetch(`http://localhost:8080/recipe/multitenancy/app/v2`, {
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
        await module.exports.removeAppAndTenants(appId);
    } else if (tenantsResp.status === 200) {
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

        const removeResp = await fetch(`http://localhost:8080/recipe/multitenancy/app/remove`, {
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
                userId: typeof userId === "string" ? userId : userId.getAsString(),
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
            await thirdparty.manuallyCreateOrUpdateUser("public", user.provider, user.userId, user.email, false);
        }
    }
};

module.exports.assertJSONEquals = (actual, expected) => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
};
