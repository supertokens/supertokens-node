/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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

import { NormalisedAppinfo } from "../../types";
import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";
import * as jose from "jose";
import NormalisedURLDomain from "../../normalisedURLDomain";
import NormalisedURLPath from "../../normalisedURLPath";
import { doFetch } from "../../utils";
import { logDebugMessage } from "../../logger";

export function validateAndNormaliseUserInput(_appInfo: NormalisedAppinfo, config: TypeInput): TypeNormalisedInput {
    if (config === undefined || config.providerConfig === undefined) {
        throw new Error("Please pass providerConfig argument in the OAuth2Client recipe.");
    }

    if (config.providerConfig.clientId === undefined) {
        throw new Error("Please pass clientId argument in the OAuth2Client providerConfig.");
    }

    // TODO: Decide on the prefix and also if we will allow users to customise clientIds
    // if (!config.providerConfig.clientId.startsWith("supertokens_")) {
    //     throw new Error(
    //         `Only Supertokens OAuth ClientIds are supported in the OAuth2Client recipe. For any other OAuth Clients use the thirdparty recipe.`
    //     );
    // }

    if (config.providerConfig.clientSecret === undefined) {
        throw new Error("Please pass clientSecret argument in the OAuth2Client providerConfig.");
    }

    if (config.providerConfig.oidcDiscoveryEndpoint === undefined) {
        throw new Error("Please pass oidcDiscoveryEndpoint argument in the OAuth2Client providerConfig.");
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        providerConfig: config.providerConfig,
        override,
    };
}

export async function doGetRequest(
    url: string,
    queryParams?: { [key: string]: string },
    headers?: { [key: string]: string }
): Promise<{
    jsonResponse: Record<string, any> | undefined;
    status: number;
    stringResponse: string;
}> {
    logDebugMessage(
        `GET request to ${url}, with query params ${JSON.stringify(queryParams)} and headers ${JSON.stringify(headers)}`
    );
    if (headers?.["Accept"] === undefined) {
        headers = {
            ...headers,
            Accept: "application/json",
        };
    }
    const finalURL = new URL(url);
    finalURL.search = new URLSearchParams(queryParams).toString();
    let response = await doFetch(finalURL.toString(), {
        headers: headers,
    });

    const stringResponse = await response.text();
    let jsonResponse: Record<string, any> | undefined = undefined;

    if (response.status < 400) {
        jsonResponse = JSON.parse(stringResponse);
    }

    logDebugMessage(`Received response with status ${response.status} and body ${stringResponse}`);
    return {
        stringResponse,
        status: response.status,
        jsonResponse,
    };
}

export async function doPostRequest(
    url: string,
    params: { [key: string]: any },
    headers?: { [key: string]: string }
): Promise<{
    jsonResponse: Record<string, any> | undefined;
    status: number;
    stringResponse: string;
}> {
    if (headers === undefined) {
        headers = {};
    }

    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Accept"] = "application/json";

    logDebugMessage(
        `POST request to ${url}, with params ${JSON.stringify(params)} and headers ${JSON.stringify(headers)}`
    );

    const body = new URLSearchParams(params).toString();
    let response = await doFetch(url, {
        method: "POST",
        body,
        headers,
    });

    const stringResponse = await response.text();
    let jsonResponse: Record<string, any> | undefined = undefined;

    if (response.status < 400) {
        jsonResponse = JSON.parse(stringResponse);
    }

    logDebugMessage(`Received response with status ${response.status} and body ${stringResponse}`);
    return {
        stringResponse,
        status: response.status,
        jsonResponse,
    };
}

export async function verifyIdTokenFromJWKSEndpointAndGetPayload(
    idToken: string,
    jwks: jose.JWTVerifyGetKey,
    otherOptions: jose.JWTVerifyOptions
): Promise<any> {
    const { payload } = await jose.jwtVerify(idToken, jwks, otherOptions);

    return payload;
}

// OIDC utils
var oidcInfoMap: { [key: string]: any } = {};

export async function getOIDCDiscoveryInfo(issuer: string): Promise<any> {
    const normalizedDomain = new NormalisedURLDomain(issuer);
    let normalizedPath = new NormalisedURLPath(issuer);
    const openIdConfigPath = new NormalisedURLPath("/.well-known/openid-configuration");

    normalizedPath = normalizedPath.appendPath(openIdConfigPath);

    if (oidcInfoMap[issuer] !== undefined) {
        return oidcInfoMap[issuer];
    }
    const oidcInfo = await doGetRequest(
        normalizedDomain.getAsStringDangerous() + normalizedPath.getAsStringDangerous()
    );

    if (oidcInfo.status >= 400) {
        logDebugMessage(`Received response with status ${oidcInfo.status} and body ${oidcInfo.stringResponse}`);
        throw new Error(`Received response with status ${oidcInfo.status} and body ${oidcInfo.stringResponse}`);
    }

    oidcInfoMap[issuer] = oidcInfo.jsonResponse!;
    return oidcInfo.jsonResponse!;
}
