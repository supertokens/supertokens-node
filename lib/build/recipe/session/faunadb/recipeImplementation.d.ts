// @ts-nocheck
import { VerifySessionOptions, RecipeInterface } from "../";
import * as faunadb from "faunadb";
import type { Session as FaunaDBSessionContainer } from "./types";
import type { BaseRequest, BaseResponse } from "../../../framework";
import type { SessionInformation } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
        faunaDBClient: faunadb.Client;
    };
    q: typeof faunadb.query;
    originalImplementation: RecipeInterface;
    constructor(
        originalImplementation: RecipeInterface,
        config: {
            accessFaunadbTokenFromFrontend?: boolean;
            userCollectionName: string;
            faunaDBClient: faunadb.Client;
        }
    );
    getFDAT: (userId: string) => Promise<any>;
    createNewSession: ({
        res,
        userId,
        accessTokenPayload,
        sessionData,
    }: {
        res: BaseResponse;
        userId: string;
        accessTokenPayload?: any;
        sessionData?: any;
    }) => Promise<FaunaDBSessionContainer>;
    getSession: ({
        req,
        res,
        options,
    }: {
        req: BaseRequest;
        res: BaseResponse;
        options?: VerifySessionOptions | undefined;
    }) => Promise<FaunaDBSessionContainer | undefined>;
    getSessionInformation: ({ sessionHandle }: { sessionHandle: string }) => Promise<SessionInformation>;
    refreshSession: ({ req, res }: { req: BaseRequest; res: BaseResponse }) => Promise<FaunaDBSessionContainer>;
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
    updateAccessTokenPayload: (input: { sessionHandle: string; newAccessTokenPayload: any }) => Promise<void>;
    getAccessTokenLifeTimeMS: () => Promise<number>;
    getRefreshTokenLifeTimeMS: () => Promise<number>;
}
