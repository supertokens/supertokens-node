export declare class HandshakeInfo {
    static instance: HandshakeInfo | undefined;
    jwtSigningPublicKey: string;
    cookieDomain: string;
    cookieSecure: boolean;
    accessTokenPath: string;
    refreshTokenPath: string;
    enableAntiCsrf: boolean;
    accessTokenBlacklistingEnabled: boolean;
    jwtSigningPublicKeyExpiryTime: number;
    cookieSameSite: "none" | "lax" | "strict";
    idRefreshTokenPath: string;
    static reset(): void;
    static getInstance(): Promise<HandshakeInfo>;
    constructor(jwtSigningPublicKey: string, cookieDomain: string, cookieSecure: boolean, accessTokenPath: string, refreshTokenPath: string, enableAntiCsrf: boolean, accessTokenBlacklistingEnabled: boolean, jwtSigningPublicKeyExpiryTime: number, cookieSameSite: "none" | "lax" | "strict", idRefreshTokenPath: string);
    updateJwtSigningPublicKeyInfo: (newKey: string, newExpiry: number) => void;
}
