import * as jwt from "jsonwebtoken";
import * as jwksClient from "jwks-rsa";
import { ProviderConfig, ProviderClientConfig, ProviderConfigForClientType } from "../types";

export async function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwksUri: string,
    otherOptions: jwt.VerifyOptions
): Promise<any> {
    const client = jwksClient({
        jwksUri,
    });
    function getKey(header: any, callback: any) {
        client.getSigningKey(header.kid, function (_, key: any) {
            var signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
        });
    }

    let payload: any = await new Promise((resolve, reject) => {
        jwt.verify(idToken, getKey, otherOptions, function (err, decoded) {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });

    return payload;
}

export function getProviderConfigForClient(
    providerConfig: ProviderConfig,
    clientConfig: ProviderClientConfig
): ProviderConfigForClientType {
    return {
        clientID: clientConfig.clientID,
        clientSecret: clientConfig.clientSecret,
        scope: clientConfig.scope || [],
        forcePKCE: clientConfig.forcePKCE,
        additionalConfig: clientConfig.additionalConfig,

        authorizationEndpoint: providerConfig.authorizationEndpoint,
        authorizationEndpointQueryParams: providerConfig.authorizationEndpointQueryParams,
        tokenEndpoint: providerConfig.tokenEndpoint,
        tokenEndpointBodyParams: providerConfig.tokenEndpointBodyParams,
        userInfoEndpoint: providerConfig.userInfoEndpoint,
        userInfoEndpointQueryParams: providerConfig.userInfoEndpointQueryParams,
        userInfoEndpointHeaders: providerConfig.userInfoEndpointHeaders,
        jwksURI: providerConfig.jwksURI,
        oidcDiscoveryEndpoint: providerConfig.oidcDiscoveryEndpoint,
        userInfoMap: providerConfig.userInfoMap,

        validateIdTokenPayload: providerConfig.validateIdTokenPayload,
    };
}
