// @ts-nocheck
export declare function getInfoFromAccessToken(
    token: string,
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
export declare function sanitizeNumberInput(field: any): number | undefined;
