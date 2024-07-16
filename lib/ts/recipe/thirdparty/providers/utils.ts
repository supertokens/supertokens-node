import * as jose from "jose";

import { ProviderConfigForClientType } from "../types";
import NormalisedURLDomain from "../../../normalisedURLDomain";
import NormalisedURLPath from "../../../normalisedURLPath";
import { logDebugMessage } from "../../../logger";
import { doFetch } from "../../../utils";

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
            Accept: "application/json", // few providers like github don't send back json response by default
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
    headers["Accept"] = "application/json"; // few providers like github don't send back json response by default

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

async function getOIDCDiscoveryInfo(issuer: string): Promise<any> {
    if (oidcInfoMap[issuer] !== undefined) {
        return oidcInfoMap[issuer];
    }

    const normalizedDomain = new NormalisedURLDomain(issuer);
    const normalizedPath = new NormalisedURLPath(issuer);

    let oidcInfo = await doGetRequest(normalizedDomain.getAsStringDangerous() + normalizedPath.getAsStringDangerous());
    if (oidcInfo.status > 400) {
        logDebugMessage(`Received response with status ${oidcInfo.status} and body ${oidcInfo.stringResponse}`);
        throw new Error(`Received response with status ${oidcInfo!.status} and body ${oidcInfo!.stringResponse}`);
    }

    oidcInfoMap[issuer] = oidcInfo.jsonResponse!;
    return oidcInfo.jsonResponse!;
}

export async function discoverOIDCEndpoints(config: ProviderConfigForClientType): Promise<void> {
    if (config.oidcDiscoveryEndpoint !== undefined) {
        const oidcInfo = await getOIDCDiscoveryInfo(config.oidcDiscoveryEndpoint);

        if (oidcInfo.authorization_endpoint !== undefined && config.authorizationEndpoint === undefined) {
            config.authorizationEndpoint = oidcInfo.authorization_endpoint;
        }

        if (oidcInfo.token_endpoint !== undefined && config.tokenEndpoint === undefined) {
            config.tokenEndpoint = oidcInfo.token_endpoint;
        }

        if (oidcInfo.userinfo_endpoint !== undefined && config.userInfoEndpoint === undefined) {
            config.userInfoEndpoint = oidcInfo.userinfo_endpoint;
        }

        if (oidcInfo.jwks_uri !== undefined && config.jwksURI === undefined) {
            config.jwksURI = oidcInfo.jwks_uri;
        }
    }
}

export function normaliseOIDCEndpointToIncludeWellKnown(url: string): string {
    // we call this only for built-in providers that use OIDC. We no longer generically add well-known in the custom provider
    if (url.endsWith("/.well-known/openid-configuration") === true) {
        return url;
    }

    const normalisedDomain = new NormalisedURLDomain(url);
    const normalisedPath = new NormalisedURLPath(url);
    const normalisedWellKnownPath = new NormalisedURLPath("/.well-known/openid-configuration");

    return (
        normalisedDomain.getAsStringDangerous() +
        normalisedPath.getAsStringDangerous() +
        normalisedWellKnownPath.getAsStringDangerous()
    );
}
