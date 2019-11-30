export declare class HandshakeInfo {
    static instance: HandshakeInfo | undefined;
    jwtSigningPublicKey: string;
    cookieDomain: string;
    cookieSecure: boolean;
    accessTokenPath: string;
    refreshTokenPath: string;
    enableAntiCsrf: boolean;
    static getInstance(): Promise<HandshakeInfo>;
    constructor(jwtSigningPublicKey: string, cookieDomain: string, cookieSecure: boolean, accessTokenPath: string, refreshTokenPath: string, enableAntiCsrf: boolean);
    updateJwtSigningPublicKey: (newKey: string) => void;
}
