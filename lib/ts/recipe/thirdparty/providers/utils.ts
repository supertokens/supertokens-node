import * as jwt from "jsonwebtoken";
import * as jwksClient from "jwks-rsa";
import { ProviderConfigForClientType } from "../types";
import axios from "axios";
import NormalisedURLDomain from "../../../normalisedURLDomain";
import NormalisedURLPath from "../../../normalisedURLPath";

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

    const oidcInfo = (await axios.get(normalizedDomain.getAsStringDangerous() + normalizedPath.getAsStringDangerous()))
        .data;

    oidcInfoMap[issuer] = oidcInfo;
    return oidcInfo;
}

export async function discoverOIDCEndpoints(config: ProviderConfigForClientType): Promise<ProviderConfigForClientType> {
    if (config.oidcDiscoveryEndpoint !== undefined) {
        const oidcInfo = await getOIDCDiscoveryInfo(config.oidcDiscoveryEndpoint);

        if (oidcInfo.authorisation_endpoint && config.authorizationEndpoint === undefined) {
            config.authorizationEndpoint = oidcInfo.authorisation_endpoint;
        }

        if (oidcInfo.token_endpoint && config.tokenEndpoint === undefined) {
            config.tokenEndpoint = oidcInfo.token_endpoint;
        }

        if (oidcInfo.userinfo_endpoint && config.userInfoEndpoint === undefined) {
            config.userInfoEndpoint = oidcInfo.userinfo_endpoint;
        }

        if (oidcInfo.jwks_uri && config.jwksURI === undefined) {
            config.jwksURI = oidcInfo.jwks_uri;
        }
    }

    return config;
}
