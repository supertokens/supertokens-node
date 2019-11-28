export declare class HandshakeInfo {
    static instance: HandshakeInfo | undefined;
    jwtSigningPublicKey: string;
    cookieDomain: string;
    cookieSecure: boolean;
    accessTokenPath: string;
    refreshTokenPath: string;
    static getInstance(): Promise<HandshakeInfo>;
    constructor(jwtSigningPublicKey: string, cookieDomain: string, cookieSecure: boolean, accessTokenPath: string, refreshTokenPath: string);
    updateJwtSigningPublicKey: (newKey: string) => void;
}
