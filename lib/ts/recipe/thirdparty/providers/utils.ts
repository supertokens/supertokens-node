import * as qs from "querystring";
import { ProviderConfigForClientType } from "../types";
import axios from "axios";
import NormalisedURLDomain from "../../../normalisedURLDomain";
import NormalisedURLPath from "../../../normalisedURLPath";
import { logDebugMessage } from "../../../logger";
import { verify, VerifyOptions } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export async function doGetRequest(
    url: string,
    queryParams?: { [key: string]: string },
    headers?: { [key: string]: string }
): Promise<any> {
    logDebugMessage(
        `GET request to ${url}, with query params ${JSON.stringify(queryParams)} and headers ${JSON.stringify(headers)}`
    );
    try {
        let response = await axios.get(url, {
            params: queryParams,
            headers: headers,
        });

        logDebugMessage(`Received response with status ${response.status} and body ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            const response: any = err.response;
            logDebugMessage(
                `Received response with status ${response.status} and body ${JSON.stringify(response.data)}`
            );
        }
        throw err;
    }
}

export async function doPostRequest(
    url: string,
    params: { [key: string]: any },
    headers?: { [key: string]: string }
): Promise<any> {
    if (headers === undefined) {
        headers = {};
    }

    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Accept"] = "application/json"; // few providers like github don't send back json response by default

    logDebugMessage(
        `POST request to ${url}, with params ${JSON.stringify(params)} and headers ${JSON.stringify(headers)}`
    );

    try {
        const body = qs.stringify(params);
        let response = await axios.post(url, body, {
            headers: headers,
        });

        logDebugMessage(`Received response with status ${response.status} and body ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            const response: any = err.response;
            logDebugMessage(
                `Received response with status ${response.status} and body ${JSON.stringify(response.data)}`
            );
        }
        throw err;
    }
}

export async function verifyIdTokenFromJWKSEndpointAndGetPayload(
    idToken: string,
    jwksUri: string,
    otherOptions: VerifyOptions
): Promise<any> {
    const client = jwksClient({
        jwksUri,
    });
    function getKey(header: any, callback: any) {
        client.getSigningKey(header.kid, function (_: any, key: any) {
            var signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
        });
    }

    let payload: any = await new Promise((resolve, reject) => {
        verify(idToken, getKey, otherOptions, function (err, decoded) {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });

    return payload;
}

// OIDC utils
var oidcInfoMap: { [key: string]: any } = {};

async function getOIDCDiscoveryInfo(issuer: string): Promise<any> {
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

    oidcInfoMap[issuer] = oidcInfo;
    return oidcInfo;
}

export async function discoverOIDCEndpoints(config: ProviderConfigForClientType): Promise<ProviderConfigForClientType> {
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

    return config;
}
