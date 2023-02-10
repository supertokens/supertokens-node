// @ts-nocheck
import * as jwt from "jsonwebtoken";
import { ProviderConfigForClientType } from "../types";
export declare function doGetRequest(
    url: string,
    queryParams?: {
        [key: string]: string;
    },
    headers?: {
        [key: string]: string;
    }
): Promise<any>;
export declare function doPostRequest(
    url: string,
    params: {
        [key: string]: any;
    },
    headers?: {
        [key: string]: string;
    }
): Promise<any>;
export declare function verifyIdTokenFromJWKSEndpointAndGetPayload(
    idToken: string,
    jwksUri: string,
    otherOptions: jwt.VerifyOptions
): Promise<{
    [key: string]: any;
}>;
export declare function discoverOIDCEndpoints(
    config: ProviderConfigForClientType
): Promise<ProviderConfigForClientType>;
