// @ts-nocheck
import * as jwt from "jsonwebtoken";
export declare function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwksUri: string,
    otherOptions: jwt.VerifyOptions
): Promise<any>;
