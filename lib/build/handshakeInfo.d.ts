export declare class HandshakeInfo {
    static instance: HandshakeInfo | undefined;
    jwtSigningPublicKey: string;
    enableAntiCsrf: boolean;
    accessTokenBlacklistingEnabled: boolean;
    jwtSigningPublicKeyExpiryTime: number;
    accessTokenVaildity: number;
    refreshTokenVaildity: number;
    static reset(): void;
    static getInstance(): Promise<HandshakeInfo>;
    constructor(jwtSigningPublicKey: string, enableAntiCsrf: boolean, accessTokenBlacklistingEnabled: boolean, jwtSigningPublicKeyExpiryTime: number, accessTokenVaildity: number, refreshTokenVaildity: number);
    updateJwtSigningPublicKeyInfo: (newKey: string, newExpiry: number) => void;
}
