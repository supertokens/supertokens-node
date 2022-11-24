// @ts-nocheck
import { ParsedJWTInfo } from "./jwt";
export declare function getInfoFromAccessToken(
    jwtInfo: ParsedJWTInfo,
    jwtSigningPublicKey: string,
    doAntiCsrfCheck: boolean
): Promise<{
    sessionHandle: string;
    userId: string;
    refreshTokenHash1: string;
    parentRefreshTokenHash1: string | undefined;
    userData: any;
    antiCsrfToken: string | undefined;
    expiryTime: number;
    timeCreated: number;
}>;
export declare function validateAccessTokenPayload(payload: { [key: string]: any }): void;
export declare function sanitizeNumberInput(field: any): number | undefined;
