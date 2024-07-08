// @ts-nocheck
import { NormalisedAppinfo } from "../../types";
import { TypeInput, TypeNormalisedInput } from "./types";
import * as jose from "jose";
export declare function validateAndNormaliseUserInput(
    _appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput;
export declare function doGetRequest(
    url: string,
    queryParams?: {
        [key: string]: string;
    },
    headers?: {
        [key: string]: string;
    }
): Promise<{
    jsonResponse: Record<string, any> | undefined;
    status: number;
    stringResponse: string;
}>;
export declare function doPostRequest(
    url: string,
    params: {
        [key: string]: any;
    },
    headers?: {
        [key: string]: string;
    }
): Promise<{
    jsonResponse: Record<string, any> | undefined;
    status: number;
    stringResponse: string;
}>;
export declare function verifyIdTokenFromJWKSEndpointAndGetPayload(
    idToken: string,
    jwks: jose.JWTVerifyGetKey,
    otherOptions: jose.JWTVerifyOptions
): Promise<any>;
export declare function getOIDCDiscoveryInfo(issuer: string): Promise<any>;
