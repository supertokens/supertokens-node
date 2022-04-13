import { VerifySessionOptions, RecipeInterface } from "../";
import type { SessionContainer } from "../";
import * as faunadb from "faunadb";
import { FAUNADB_SESSION_KEY, FAUNADB_TOKEN_TIME_LAG_MILLI } from "./constants";
import type { Session as FaunaDBSessionContainer } from "./types";
import type { BaseRequest, BaseResponse } from "../../../framework";
import type { SessionInformation } from "../types";

export default class RecipeImplementation implements RecipeInterface {
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
        faunaDBClient: faunadb.Client;
    };

    q = faunadb.query;

    originalImplementation: RecipeInterface;

    constructor(
        originalImplementation: RecipeInterface,
        config: {
            accessFaunadbTokenFromFrontend?: boolean;
            userCollectionName: string;
            faunaDBClient: faunadb.Client;
        }
    ) {
        this.originalImplementation = originalImplementation;
        this.config = {
            accessFaunadbTokenFromFrontend:
                config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend,
            userCollectionName: config.userCollectionName,
            faunaDBClient: config.faunaDBClient,
        };
    }

    getFDAT = async (userId: string, userContext: any) => {
        function getFaunadbTokenTimeLag() {
            if (process.env.INSTALL_PATH !== undefined) {
                // if in testing...
                return 2 * 1000;
            }
            return FAUNADB_TOKEN_TIME_LAG_MILLI;
        }

        let accessTokenLifetime = await this.originalImplementation.getAccessTokenLifeTimeMS({ userContext });
        let faunaResponse: any = await this.config.faunaDBClient.query(
            this.q.Create(this.q.Tokens(), {
                instance: this.q.Ref(this.q.Collection(this.config.userCollectionName), userId),
                ttl: this.q.TimeAdd(this.q.Now(), accessTokenLifetime + getFaunadbTokenTimeLag(), "millisecond"),
            })
        );
        return faunaResponse.secret;
    };

    createNewSession = async function (
        this: RecipeImplementation,
        {
            res,
            userId,
            accessTokenPayload = {},
            sessionData = {},
            userContext,
        }: {
            res: BaseResponse;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
            userContext: any;
        }
    ): Promise<FaunaDBSessionContainer> {
        let fdat = await this.getFDAT(userId, userContext);
        if (this.config.accessFaunadbTokenFromFrontend) {
            accessTokenPayload = {
                ...accessTokenPayload,
            };
            accessTokenPayload[FAUNADB_SESSION_KEY] = fdat;
        } else {
            sessionData = {
                ...sessionData,
            };
            sessionData[FAUNADB_SESSION_KEY] = fdat;
        }

        return getModifiedSession(
            await this.originalImplementation.createNewSession({
                res,
                userId,
                accessTokenPayload,
                sessionData,
                userContext,
            })
        );
    };

    getSession = async function (
        this: RecipeImplementation,
        {
            req,
            res,
            options,
            userContext,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            options?: VerifySessionOptions;
            userContext: any;
        }
    ): Promise<FaunaDBSessionContainer | undefined> {
        let originalSession = await this.originalImplementation.getSession({ req, res, options, userContext });
        if (originalSession === undefined) {
            return undefined;
        }
        return getModifiedSession(originalSession);
    };

    getSessionInformation = function (
        this: RecipeImplementation,
        { sessionHandle, userContext }: { sessionHandle: string; userContext: any }
    ): Promise<SessionInformation> {
        return this.originalImplementation.getSessionInformation({ sessionHandle, userContext });
    };

    refreshSession = async function (
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
    ): Promise<FaunaDBSessionContainer> {
        let originalSession = await this.originalImplementation.refreshSession({ req, res, userContext });
        let session = getModifiedSession(originalSession);
        let fdat = await this.getFDAT(session.getUserId(), userContext);

        // we do not use the accessFaunaDBTokenFromFrontend boolean here so that
        // it can be changed without affecting existing sessions.
        if (session.getAccessTokenPayload()[FAUNADB_SESSION_KEY] !== undefined) {
            let newPayload = {
                ...session.getAccessTokenPayload(),
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateAccessTokenPayload(newPayload);
        } else {
            let newPayload = {
                ...(await session.getSessionData()),
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateSessionData(newPayload);
        }

        return session;
    };

    revokeAllSessionsForUser = function (
        this: RecipeImplementation,
        { userId, userContext }: { userId: string; userContext: any }
    ) {
        return this.originalImplementation.revokeAllSessionsForUser({ userId, userContext });
    };

    getAllSessionHandlesForUser = function (
        this: RecipeImplementation,
        { userId, userContext }: { userId: string; userContext: any }
    ): Promise<string[]> {
        return this.originalImplementation.getAllSessionHandlesForUser({ userId, userContext });
    };

    revokeSession = function (
        this: RecipeImplementation,
        { sessionHandle, userContext }: { sessionHandle: string; userContext: any }
    ): Promise<boolean> {
        return this.originalImplementation.revokeSession({ sessionHandle, userContext });
    };

    revokeMultipleSessions = function (
        this: RecipeImplementation,
        { sessionHandles, userContext }: { sessionHandles: string[]; userContext: any }
    ) {
        return this.originalImplementation.revokeMultipleSessions({ sessionHandles, userContext });
    };

    updateSessionData = function (
        this: RecipeImplementation,
        { sessionHandle, newSessionData, userContext }: { sessionHandle: string; newSessionData: any; userContext: any }
    ) {
        return this.originalImplementation.updateSessionData({ sessionHandle, newSessionData, userContext });
    };

    updateAccessTokenPayload = function (
        this: RecipeImplementation,
        input: { sessionHandle: string; newAccessTokenPayload: any; userContext: any }
    ) {
        return this.originalImplementation.updateAccessTokenPayload(input);
    };

    mergeIntoAccessTokenPayload = function (
        this: RecipeImplementation,
        input: { sessionHandle: string; accessTokenPayloadUpdate: any; userContext: any }
    ) {
        return this.originalImplementation.mergeIntoAccessTokenPayload(input);
    };

    updateSessionClaims = function (input: { sessionHandle: string; userContext: any }) {
        return this.originalImplementation.updateSessionClaims(input);
    };
    regenerateAccessToken = function (input: { accessToken: string; newAccessTokenPayload?: any; userContext: any }) {
        return this.originalImplementation.regenerateAccessToken(input);
    };

    getAccessTokenLifeTimeMS = async function (
        this: RecipeImplementation,
        input: { userContext: any }
    ): Promise<number> {
        return this.originalImplementation.getAccessTokenLifeTimeMS(input);
    };

    getRefreshTokenLifeTimeMS = async function (
        this: RecipeImplementation,
        input: { userContext: any }
    ): Promise<number> {
        return this.originalImplementation.getRefreshTokenLifeTimeMS(input);
    };
}

function getModifiedSession(session: SessionContainer): FaunaDBSessionContainer {
    return {
        ...session,
        getFaunadbToken: async (userContext?: any): Promise<string> => {
            let accessTokenPayload = session.getAccessTokenPayload(userContext);
            if (accessTokenPayload[FAUNADB_SESSION_KEY] !== undefined) {
                // this operation costs nothing. So we can check
                return accessTokenPayload[FAUNADB_SESSION_KEY];
            } else {
                let sessionData = await session.getSessionData(userContext);
                return sessionData[FAUNADB_SESSION_KEY];
            }
        },
    };
}
