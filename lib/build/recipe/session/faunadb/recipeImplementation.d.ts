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
    createNewSession: (
        this: RecipeImplementation,
        {
            res,
            userId,
            accessTokenPayload,
            sessionData,
        }: {
            res: BaseResponse;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
        }
    ) => Promise<FaunaDBSessionContainer>;
    getSession: (
        this: RecipeImplementation,
        {
            req,
            res,
            options,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            options?: VerifySessionOptions | undefined;
        }
    ) => Promise<FaunaDBSessionContainer | undefined>;
    getSessionInformation: (
        this: RecipeImplementation,
        {
            sessionHandle,
        }: {
            sessionHandle: string;
        }
    ) => Promise<SessionInformation>;
    refreshSession: (
        this: RecipeImplementation,
        {
            req,
            res,
        }: {
            req: BaseRequest;
            res: BaseResponse;
        }
    ) => Promise<FaunaDBSessionContainer>;
    revokeAllSessionsForUser: (
        this: RecipeImplementation,
        {
            userId,
        }: {
            userId: string;
        }
    ) => any;
    getAllSessionHandlesForUser: (
        this: RecipeImplementation,
        {
            userId,
        }: {
            userId: string;
        }
    ) => Promise<string[]>;
    revokeSession: (
        this: RecipeImplementation,
        {
            sessionHandle,
        }: {
            sessionHandle: string;
        }
    ) => Promise<boolean>;
    revokeMultipleSessions: (
        this: RecipeImplementation,
        {
            sessionHandles,
        }: {
            sessionHandles: string[];
        }
    ) => any;
    updateSessionData: (
        this: RecipeImplementation,
        {
            sessionHandle,
            newSessionData,
        }: {
            sessionHandle: string;
            newSessionData: any;
        }
    ) => any;
    updateAccessTokenPayload: (
        this: RecipeImplementation,
        input: {
            sessionHandle: string;
            newAccessTokenPayload: any;
        }
    ) => any;
    getAccessTokenLifeTimeMS: (this: RecipeImplementation) => Promise<number>;
    getRefreshTokenLifeTimeMS: (this: RecipeImplementation) => Promise<number>;
}
