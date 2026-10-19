"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDiscordAccessToken =
    exports.checkGitLabAccessToken =
    exports.checkFacebookAccessToken =
    exports.checkGoogleAccessToken =
        void 0;
exports.addClientAccessTokenCheck = addClientAccessTokenCheck;
const custom_1 = require("./custom");
const querier_1 = require("../../../querier");
const logger_1 = require("../../../logger");
/**
 * Before the user info is fetched with an access token that the client sent (in `oAuthTokens`), checks with the
 * provider that the access token was issued to one of the provider's clients.
 *
 * The check is skipped:
 * - if `validateAccessToken` is set in the provider config (custom.ts runs that instead, as before)
 * - for the access token the SDK got itself, by exchanging an authorisation code with the provider. This works because
 *   a new provider instance is created for every request.
 */
function addClientAccessTokenCheck(impl, providerConfig, check) {
    if (impl.type !== "oauth2") {
        return;
    }
    let accessTokenFromCodeExchange = undefined;
    const oExchangeAuthCodeForOAuthTokens = impl.exchangeAuthCodeForOAuthTokens;
    impl.exchangeAuthCodeForOAuthTokens = async function (input) {
        const oAuthTokens = await oExchangeAuthCodeForOAuthTokens(input);
        if (oAuthTokens !== undefined && oAuthTokens !== null && typeof oAuthTokens.access_token === "string") {
            accessTokenFromCodeExchange = oAuthTokens.access_token;
        }
        return oAuthTokens;
    };
    const oGetUserInfo = impl.getUserInfo;
    impl.getUserInfo = async function (input) {
        var _a;
        const accessToken = (_a = input.oAuthTokens) === null || _a === void 0 ? void 0 : _a.access_token;
        if (
            impl.config.validateAccessToken === undefined &&
            typeof accessToken === "string" &&
            accessToken !== accessTokenFromCodeExchange
        ) {
            await check({
                accessToken,
                clientConfig: impl.config,
                clientIds: getClientIds(providerConfig, impl.config),
            });
        }
        return oGetUserInfo(input);
    };
}
function getClientIds(providerConfig, clientConfig) {
    var _a;
    const clientIds = new Set();
    for (const client of (_a = providerConfig.clients) !== null && _a !== void 0 ? _a : []) {
        if (client.clientId !== undefined) {
            clientIds.add((0, custom_1.getActualClientIdFromDevelopmentClientId)(client.clientId));
        }
    }
    if (clientConfig.clientId !== undefined) {
        clientIds.add((0, custom_1.getActualClientIdFromDevelopmentClientId)(clientConfig.clientId));
    }
    return clientIds;
}
function isOneOf(value, clientIds) {
    if (typeof value !== "string" && typeof value !== "number") {
        return false;
    }
    return clientIds.has(String(value));
}
// We don't log the query params, the headers or the response body of these requests, since they contain the access
// token (and for Facebook, the client secret).
async function doAccessTokenCheckRequest(url, input) {
    const finalURL = new URL(url);
    if (input.queryParams !== undefined) {
        finalURL.search = new URLSearchParams(input.queryParams).toString();
    }
    const headers = Object.assign({ Accept: "application/json" }, input.headers);
    let body = undefined;
    if (input.formParams !== undefined) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(input.formParams).toString();
    }
    (0, logger_1.logDebugMessage)(`${input.method} request to ${url} to check an access token sent by the client`);
    const response = await (0, querier_1.doFetch)(finalURL.toString(), {
        method: input.method,
        headers,
        body,
    });
    const stringResponse = await response.text();
    (0, logger_1.logDebugMessage)(`Received response with status ${response.status}`);
    let jsonResponse = undefined;
    if (response.status < 400) {
        try {
            jsonResponse = JSON.parse(stringResponse);
        } catch (_a) {
            jsonResponse = undefined;
        }
    }
    return { status: response.status, jsonResponse };
}
function throwForFailedCheck(providerName, status, invalidTokenStatuses) {
    if (invalidTokenStatuses.includes(status)) {
        throw new Error("Invalid access token");
    }
    throw new Error(`Could not check the access token with ${providerName} (status ${status})`);
}
// Google's token info API returns the client the token is for (aud) and the client that requested it (azp). They can
// differ, e.g. for tokens requested on Android or iOS for another client of the same Google Cloud project.
const checkGoogleAccessToken = async ({ accessToken, clientIds }) => {
    const res = await doAccessTokenCheckRequest("https://oauth2.googleapis.com/tokeninfo", {
        method: "POST",
        formParams: { access_token: accessToken },
    });
    if (res.status !== 200 || res.jsonResponse === undefined) {
        throwForFailedCheck("Google", res.status, [400, 401]);
    }
    if (!isOneOf(res.jsonResponse.aud, clientIds) && !isOneOf(res.jsonResponse.azp, clientIds)) {
        throw new Error("Access token does not belong to your application");
    }
};
exports.checkGoogleAccessToken = checkGoogleAccessToken;
// Facebook's debug token API needs an app access token, which is made from the client id and the client secret.
const checkFacebookAccessToken = async ({ accessToken, clientConfig, clientIds }) => {
    if (clientConfig.clientSecret === undefined) {
        throw new Error(
            "The Facebook provider needs the clientSecret of the client to check access tokens sent in oAuthTokens. Please add it to the provider config, or set a custom validateAccessToken."
        );
    }
    const res = await doAccessTokenCheckRequest("https://graph.facebook.com/debug_token", {
        method: "GET",
        queryParams: {
            input_token: accessToken,
            access_token: `${(0, custom_1.getActualClientIdFromDevelopmentClientId)(clientConfig.clientId)}|${
                clientConfig.clientSecret
            }`,
        },
    });
    if (res.status !== 200 || res.jsonResponse === undefined || typeof res.jsonResponse.data !== "object") {
        throw new Error(
            `Could not check the access token with Facebook (status ${res.status}). Please check the clientId and clientSecret of the Facebook provider.`
        );
    }
    if (res.jsonResponse.data.is_valid !== true) {
        throw new Error("Invalid access token");
    }
    if (!isOneOf(res.jsonResponse.data.app_id, clientIds)) {
        throw new Error("Access token does not belong to your application");
    }
};
exports.checkFacebookAccessToken = checkFacebookAccessToken;
// GitLab's token info API returns the application (client id) the token was issued to.
const checkGitLabAccessToken = async ({ accessToken, clientConfig, clientIds }) => {
    var _a;
    const res = await doAccessTokenCheckRequest(getGitLabBaseURL(clientConfig) + "/oauth/token/info", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status !== 200 || res.jsonResponse === undefined) {
        throwForFailedCheck("GitLab", res.status, [401]);
    }
    if (!isOneOf((_a = res.jsonResponse.application) === null || _a === void 0 ? void 0 : _a.uid, clientIds)) {
        throw new Error("Access token does not belong to your application");
    }
};
exports.checkGitLabAccessToken = checkGitLabAccessToken;
function getGitLabBaseURL(clientConfig) {
    const wellKnownSuffix = "/.well-known/openid-configuration";
    const discoveryEndpoint = clientConfig.oidcDiscoveryEndpoint;
    if (discoveryEndpoint !== undefined && discoveryEndpoint.endsWith(wellKnownSuffix)) {
        return discoveryEndpoint.slice(0, -wellKnownSuffix.length);
    }
    return "https://gitlab.com";
}
// Discord's current authorization API returns the application the token was issued to. Discord's client id is the
// application's id.
const checkDiscordAccessToken = async ({ accessToken, clientIds }) => {
    var _a;
    const res = await doAccessTokenCheckRequest("https://discord.com/api/oauth2/@me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status !== 200 || res.jsonResponse === undefined) {
        throwForFailedCheck("Discord", res.status, [401]);
    }
    if (!isOneOf((_a = res.jsonResponse.application) === null || _a === void 0 ? void 0 : _a.id, clientIds)) {
        throw new Error("Access token does not belong to your application");
    }
};
exports.checkDiscordAccessToken = checkDiscordAccessToken;
