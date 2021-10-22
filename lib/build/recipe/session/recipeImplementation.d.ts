// @ts-nocheck
import {
    RecipeInterface,
    VerifySessionOptions,
    TypeNormalisedInput,
    SessionInformation,
    KeyInfo,
    AntiCsrfType,
} from "./types";
import Session from "./sessionClass";
import { Querier } from "../../querier";
declare class HandshakeInfo {
    antiCsrf: AntiCsrfType;
    accessTokenBlacklistingEnabled: boolean;
    accessTokenValidity: number;
    refreshTokenValidity: number;
    private rawJwtSigningPublicKeyList;
    constructor(
        antiCsrf: AntiCsrfType,
        accessTokenBlacklistingEnabled: boolean,
        accessTokenValidity: number,
        refreshTokenValidity: number,
        rawJwtSigningPublicKeyList: KeyInfo[]
    );
    setJwtSigningPublicKeyList(updatedList: KeyInfo[]): void;
    getJwtSigningPublicKeyList(): KeyInfo[];
    clone(): HandshakeInfo;
}
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    config: TypeNormalisedInput;
    handshakeInfo: HandshakeInfo | undefined;
    isInServerlessEnv: boolean;
    constructor(querier: Querier, config: TypeNormalisedInput, isInServerlessEnv: boolean);
    createNewSession: ({
        res,
        userId,
        accessTokenPayload,
        sessionData,
    }: {
        res: any;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
    }) => Promise<Session>;
    getSession: ({
        req,
        res,
        options,
    }: {
        req: any;
        res: any;
        options?: VerifySessionOptions | undefined;
    }) => Promise<Session | undefined>;
    getSessionInformation: ({ sessionHandle }: { sessionHandle: string }) => Promise<SessionInformation>;
    refreshSession: ({ req, res }: { req: any; res: any }) => Promise<Session>;
    revokeAllSessionsForUser: ({ userId }: { userId: string }) => Promise<string[]>;
    getAllSessionHandlesForUser: ({ userId }: { userId: string }) => Promise<string[]>;
    revokeSession: ({ sessionHandle }: { sessionHandle: string }) => Promise<boolean>;
    revokeMultipleSessions: ({ sessionHandles }: { sessionHandles: string[] }) => Promise<string[]>;
    updateSessionData: ({
        sessionHandle,
        newSessionData,
    }: {
        sessionHandle: string;
        newSessionData: any;
    }) => Promise<void>;
    updateAccessTokenPayload: ({
        sessionHandle,
        newAccessTokenPayload,
    }: {
        sessionHandle: string;
        newAccessTokenPayload: any;
    }) => Promise<void>;
    getHandshakeInfo: (forceRefetch?: boolean) => Promise<HandshakeInfo>;
    /**
     * Update the cached list of signing keys
     * @param keyList The list of signing keys on the response object. Before 2.9 always undefined, after it always contains at least 1 key
     * @param publicKey The public key of the latest signing key
     * @param expiryTime The expiry time of the latest signing key
     */
    updateJwtSigningPublicKeyInfo: (keyList: KeyInfo[] | undefined, publicKey: string, expiryTime: number) => void;
    getAccessTokenLifeTimeMS: () => Promise<number>;
    getRefreshTokenLifeTimeMS: () => Promise<number>;
}
export {};
