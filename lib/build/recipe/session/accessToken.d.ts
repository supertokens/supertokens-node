// @ts-nocheck
import { ParsedJWTInfo } from "./jwt";
import * as jose from "jose";
import RecipeUserId from "../../recipeUserId";
export declare function getInfoFromAccessToken(
    jwtInfo: ParsedJWTInfo,
    jwks: jose.JWTVerifyGetKey,
    doAntiCsrfCheck: boolean
): Promise<{
    sessionHandle: string;
    userId: string;
    recipeUserId: RecipeUserId;
    refreshTokenHash1: string;
    parentRefreshTokenHash1: string | undefined;
    userData: any;
    antiCsrfToken: string | undefined;
    expiryTime: number;
    timeCreated: number;
    tenantId: string;
}>;
export declare function validateAccessTokenStructure(payload: any, version: number): void;
export declare function sanitizeNumberInput(field: any): number | undefined;
