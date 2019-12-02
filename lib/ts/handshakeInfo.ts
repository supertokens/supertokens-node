import { AuthError, generateError } from "./error";
import { Querier } from "./querier";

export class HandshakeInfo {
    static instance: HandshakeInfo | undefined;

    public jwtSigningPublicKey: string;
    public cookieDomain: string;
    public cookieSecure: boolean;
    public accessTokenPath: string;
    public refreshTokenPath: string;
    public enableAntiCsrf: boolean;
    public accessTokenBlacklistingEnabled: boolean;
    public jwtSigningPublicKeyExpiryTime: number;

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw generateError(AuthError.GENERAL_ERROR, new Error("calling testing function in non testing env"));
        }
        HandshakeInfo.instance = undefined;
    }

    // @throws GENERAL_ERROR
    static async getInstance(): Promise<HandshakeInfo> {
        if (HandshakeInfo.instance == undefined) {
            let response = await Querier.getInstance().sendPostRequest("/handshake", {});
            HandshakeInfo.instance = new HandshakeInfo(
                response.jwtSigningPublicKey,
                response.cookieDomain,
                response.cookieSecure,
                response.accessTokenPath,
                response.refreshTokenPath,
                response.enableAntiCsrf,
                response.accessTokenBlacklistingEnabled,
                response.jwtSigningPublicKeyExpiryTime
            );
        }
        return HandshakeInfo.instance;
    }

    constructor(
        jwtSigningPublicKey: string,
        cookieDomain: string,
        cookieSecure: boolean,
        accessTokenPath: string,
        refreshTokenPath: string,
        enableAntiCsrf: boolean,
        accessTokenBlacklistingEnabled: boolean,
        jwtSigningPublicKeyExpiryTime: number
    ) {
        this.jwtSigningPublicKey = jwtSigningPublicKey;
        this.cookieDomain = cookieDomain;
        this.cookieSecure = cookieSecure;
        this.accessTokenPath = accessTokenPath;
        this.refreshTokenPath = refreshTokenPath;
        this.enableAntiCsrf = enableAntiCsrf;
        this.accessTokenBlacklistingEnabled = accessTokenBlacklistingEnabled;
        this.jwtSigningPublicKeyExpiryTime = jwtSigningPublicKeyExpiryTime;
    }

    updateJwtSigningPublicKeyInfo = (newKey: string, newExpiry: number) => {
        this.jwtSigningPublicKey = newKey;
        this.jwtSigningPublicKeyExpiryTime = newExpiry;
    };
}
