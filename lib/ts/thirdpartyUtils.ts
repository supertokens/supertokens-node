import * as jose from "jose";
import { logDebugMessage } from "./logger";
import { doFetch } from "./utils";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";

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
