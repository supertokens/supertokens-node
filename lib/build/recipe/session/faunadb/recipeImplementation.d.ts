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
    getFDAT: (userId: string, userContext: any) => Promise<any>;
    createNewSession: (
        this: RecipeImplementation,
        {
            res,
            userId,
            accessTokenPayload,
            sessionData,
            userContext,
        }: {
            res: BaseResponse;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
            userContext: any;
        }
    ) => Promise<FaunaDBSessionContainer>;
    getSession: (
        this: RecipeImplementation,
        {
            req,
            res,
            options,
            userContext,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            options?: VerifySessionOptions | undefined;
            userContext: any;
        }
    ) => Promise<FaunaDBSessionContainer | undefined>;
    getSessionInformation: (
        this: RecipeImplementation,
        {
            sessionHandle,
            userContext,
        }: {
            sessionHandle: string;
            userContext: any;
        }
    ) => Promise<SessionInformation>;
    refreshSession: (
        this: RecipeImplementation,
        {
            req,
            res,
            userContext,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            userContext: any;
        }
    ) => Promise<FaunaDBSessionContainer>;
    revokeAllSessionsForUser: (
        this: RecipeImplementation,
        {
            userId,
            userContext,
        }: {
            userId: string;
            userContext: any;
        }
    ) => Promise<string[]>;
    getAllSessionHandlesForUser: (
        this: RecipeImplementation,
        {
            userId,
            userContext,
        }: {
            userId: string;
            userContext: any;
        }
    ) => Promise<string[]>;
    revokeSession: (
        this: RecipeImplementation,
        {
            sessionHandle,
            userContext,
        }: {
            sessionHandle: string;
            userContext: any;
        }
    ) => Promise<boolean>;
    revokeMultipleSessions: (
        this: RecipeImplementation,
        {
            sessionHandles,
            userContext,
        }: {
            sessionHandles: string[];
            userContext: any;
        }
    ) => Promise<string[]>;
    updateSessionData: (
        this: RecipeImplementation,
        {
            sessionHandle,
            newSessionData,
            userContext,
        }: {
            sessionHandle: string;
            newSessionData: any;
            userContext: any;
        }
    ) => Promise<void>;
    updateAccessTokenPayload: (
        this: RecipeImplementation,
        input: {
            sessionHandle: string;
            newAccessTokenPayload: any;
            userContext: any;
        }
    ) => Promise<void>;
    updateSessionClaims: (input: {
        sessionHandle: string;
        claims: Record<string, import("../../../types").JSONObject>;
        userContext: any;
    }) => any;
    regenerateAccessToken: (input: { accessToken: string; newAccessTokenPayload?: any; userContext: any }) => any;
    getAccessTokenLifeTimeMS: (
        this: RecipeImplementation,
        input: {
            userContext: any;
        }
    ) => Promise<number>;
    getRefreshTokenLifeTimeMS: (
        this: RecipeImplementation,
        input: {
            userContext: any;
        }
    ) => Promise<number>;
}
