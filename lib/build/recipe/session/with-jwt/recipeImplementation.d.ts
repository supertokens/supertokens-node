// @ts-nocheck
import { RecipeInterface } from "../";
import { RecipeInterface as JWTRecipeInterface } from "../../jwt/types";
import { SessionContainerInterface, VerifySessionOptions, SessionInformation } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    originalImplementation: RecipeInterface;
    jwtRecipeImplementation: JWTRecipeInterface;
    constructor(originalImplementation: RecipeInterface, jwtRecipeImplementation: JWTRecipeInterface);
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
    }) => Promise<SessionContainerInterface>;
    getSession: ({
        req,
        res,
        options,
    }: {
        req: any;
        res: any;
        options?: VerifySessionOptions | undefined;
    }) => Promise<SessionContainerInterface | undefined>;
    refreshSession: ({ req, res }: { req: any; res: any }) => Promise<SessionContainerInterface>;
    getSessionInformation: ({ sessionHandle }: { sessionHandle: string }) => Promise<SessionInformation>;
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
    getAccessTokenLifeTimeMS: () => Promise<number>;
    getRefreshTokenLifeTimeMS: () => Promise<number>;
}
