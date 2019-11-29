import { Querier } from "./querier";

export class HandshakeInfo {
    static instance: HandshakeInfo | undefined;

    public jwtSigningPublicKey: string;
    public cookieDomain: string;
    public cookieSecure: boolean;
    public accessTokenPath: string;
    public refreshTokenPath: string;

    // @throws GENERAL_ERROR
    static async getInstance(): Promise<HandshakeInfo> {
        if (HandshakeInfo.instance == undefined) {
            let response = await Querier.getInstance().sendPostRequest("/handshake", {});
            HandshakeInfo.instance = new HandshakeInfo(
                response.jwtSigningPublicKey,
                response.cookieDomain,
                response.cookieSecure,
                response.accessTokenPath,
                response.refreshTokenPath
            );
        }
        return HandshakeInfo.instance;
    }

    constructor(
        jwtSigningPublicKey: string,
        cookieDomain: string,
        cookieSecure: boolean,
        accessTokenPath: string,
        refreshTokenPath: string
    ) {
        this.jwtSigningPublicKey = jwtSigningPublicKey;
        this.cookieDomain = cookieDomain;
        this.cookieSecure = cookieSecure;
        this.accessTokenPath = accessTokenPath;
        this.refreshTokenPath = refreshTokenPath;
    }

    updateJwtSigningPublicKey = (newKey: string) => {
        this.jwtSigningPublicKey = newKey;
    };
}
