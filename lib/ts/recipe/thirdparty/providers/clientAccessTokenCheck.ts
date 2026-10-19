/* Copyright (c) 2026, VRAI Labs and/or its affiliates. All rights reserved.
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
import { ProviderConfig, ProviderConfigForClientType, TypeProvider } from "../types";
import { getActualClientIdFromDevelopmentClientId } from "./custom";
import { doFetch } from "../../../querier";
import { logDebugMessage } from "../../../logger";

export type ClientAccessTokenCheck = (input: {
    accessToken: string;
    clientConfig: ProviderConfigForClientType;
    // The client ids of every client of the provider (for this tenant)
    clientIds: Set<string>;
}) => Promise<void>;

/**
 * Before the user info is fetched with an access token that the client sent (in `oAuthTokens`), checks with the
 * provider that the access token was issued to one of the provider's clients.
 *
 * The check is skipped:
 * - if `validateAccessToken` is set in the provider config (custom.ts runs that instead, as before)
 * - for the access token the SDK got itself, by exchanging an authorisation code with the provider. This works because
 *   a new provider instance is created for every request.
 */
export function addClientAccessTokenCheck(
    impl: TypeProvider,
    providerConfig: ProviderConfig,
    check: ClientAccessTokenCheck
) {
    if (impl.type !== "oauth2") {
        return;
    }

    let accessTokenFromCodeExchange: string | undefined = undefined;

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
        const accessToken = input.oAuthTokens?.access_token;
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

function getClientIds(providerConfig: ProviderConfig, clientConfig: ProviderConfigForClientType): Set<string> {
    const clientIds = new Set<string>();
    for (const client of providerConfig.clients ?? []) {
        if (client.clientId !== undefined) {
            clientIds.add(getActualClientIdFromDevelopmentClientId(client.clientId));
        }
    }
    if (clientConfig.clientId !== undefined) {
        clientIds.add(getActualClientIdFromDevelopmentClientId(clientConfig.clientId));
    }
    return clientIds;
}

function isOneOf(value: unknown, clientIds: Set<string>): boolean {
    if (typeof value !== "string" && typeof value !== "number") {
        return false;
    }
    return clientIds.has(String(value));
}

// We don't log the query params, the headers or the response body of these requests, since they contain the access
// token (and for Facebook, the client secret).
async function doAccessTokenCheckRequest(
    url: string,
    input: {
        method: "GET" | "POST";
        queryParams?: { [key: string]: string };
        formParams?: { [key: string]: string };
        headers?: { [key: string]: string };
    }
): Promise<{ status: number; jsonResponse: any }> {
    const finalURL = new URL(url);
    if (input.queryParams !== undefined) {
        finalURL.search = new URLSearchParams(input.queryParams).toString();
    }
    const headers: { [key: string]: string } = {
        Accept: "application/json",
        ...input.headers,
    };
    let body: string | undefined = undefined;
    if (input.formParams !== undefined) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        body = new URLSearchParams(input.formParams).toString();
    }

    logDebugMessage(`${input.method} request to ${url} to check an access token sent by the client`);
    const response = await doFetch(finalURL.toString(), {
        method: input.method,
        headers,
        body,
    });
    const stringResponse = await response.text();
    logDebugMessage(`Received response with status ${response.status}`);

    let jsonResponse: any = undefined;
    if (response.status < 400) {
        try {
            jsonResponse = JSON.parse(stringResponse);
        } catch {
            jsonResponse = undefined;
        }
    }
    return { status: response.status, jsonResponse };
}

function throwForFailedCheck(providerName: string, status: number, invalidTokenStatuses: number[]): never {
    if (invalidTokenStatuses.includes(status)) {
        throw new Error("Invalid access token");
    }
    throw new Error(`Could not check the access token with ${providerName} (status ${status})`);
}

// Google's token info API returns the client the token is for (aud) and the client that requested it (azp). They can
// differ, e.g. for tokens requested on Android or iOS for another client of the same Google Cloud project.
export const checkGoogleAccessToken: ClientAccessTokenCheck = async ({ accessToken, clientIds }) => {
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

// Facebook's debug token API needs an app access token, which is made from the client id and the client secret.
export const checkFacebookAccessToken: ClientAccessTokenCheck = async ({ accessToken, clientConfig, clientIds }) => {
    if (clientConfig.clientSecret === undefined) {
        throw new Error(
            "The Facebook provider needs the clientSecret of the client to check access tokens sent in oAuthTokens. Please add it to the provider config, or set a custom validateAccessToken."
        );
    }
    const res = await doAccessTokenCheckRequest("https://graph.facebook.com/debug_token", {
        method: "GET",
        queryParams: {
            input_token: accessToken,
            access_token: `${getActualClientIdFromDevelopmentClientId(clientConfig.clientId)}|${
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

// GitLab's token info API returns the application (client id) the token was issued to.
export const checkGitLabAccessToken: ClientAccessTokenCheck = async ({ accessToken, clientConfig, clientIds }) => {
    const res = await doAccessTokenCheckRequest(getGitLabBaseURL(clientConfig) + "/oauth/token/info", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status !== 200 || res.jsonResponse === undefined) {
        throwForFailedCheck("GitLab", res.status, [401]);
    }
    if (!isOneOf(res.jsonResponse.application?.uid, clientIds)) {
        throw new Error("Access token does not belong to your application");
    }
};

function getGitLabBaseURL(clientConfig: ProviderConfigForClientType): string {
    const wellKnownSuffix = "/.well-known/openid-configuration";
    const discoveryEndpoint = clientConfig.oidcDiscoveryEndpoint;
    if (discoveryEndpoint !== undefined && discoveryEndpoint.endsWith(wellKnownSuffix)) {
        return discoveryEndpoint.slice(0, -wellKnownSuffix.length);
    }
    return "https://gitlab.com";
}

// Discord's current authorization API returns the application the token was issued to. Discord's client id is the
// application's id.
export const checkDiscordAccessToken: ClientAccessTokenCheck = async ({ accessToken, clientIds }) => {
    const res = await doAccessTokenCheckRequest("https://discord.com/api/oauth2/@me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status !== 200 || res.jsonResponse === undefined) {
        throwForFailedCheck("Discord", res.status, [401]);
    }
    if (!isOneOf(res.jsonResponse.application?.id, clientIds)) {
        throw new Error("Access token does not belong to your application");
    }
};
