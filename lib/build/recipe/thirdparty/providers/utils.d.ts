// @ts-nocheck
import * as jose from "jose";
export declare function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwksUri: string,
    otherOptions: jose.JWTVerifyOptions
): Promise<any>;
