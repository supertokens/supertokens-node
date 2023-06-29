// @ts-nocheck
import * as jose from "jose";
export declare function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwks: jose.JWTVerifyGetKey,
    otherOptions: jose.JWTVerifyOptions
): Promise<any>;
