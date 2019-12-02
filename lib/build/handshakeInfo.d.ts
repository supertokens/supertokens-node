export declare class HandshakeInfo {
    static instance: HandshakeInfo | undefined;
    jwtSigningPublicKey: string;
    cookieDomain: string;
    cookieSecure: boolean;
    accessTokenPath: string;
    refreshTokenPath: string;
    enableAntiCsrf: boolean;
    accessTokenBlacklistingEnabled: boolean;
    static reset(): void;
    static getInstance(): Promise<HandshakeInfo>;
    constructor(jwtSigningPublicKey: string, cookieDomain: string, cookieSecure: boolean, accessTokenPath: string, refreshTokenPath: string, enableAntiCsrf: boolean, accessTokenBlacklistingEnabled: boolean);
    updateJwtSigningPublicKey: (newKey: string) => void;
}
