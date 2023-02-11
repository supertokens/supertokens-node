// @ts-nocheck
import { VerifyOptions } from "jsonwebtoken";
export declare function verifyIdTokenFromJWKSEndpoint(
    idToken: string,
    jwksUri: string,
    otherOptions: VerifyOptions
): Promise<any>;
