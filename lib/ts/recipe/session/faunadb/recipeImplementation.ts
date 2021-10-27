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

    getFDAT = async (userId: string) => {
        function getFaunadbTokenTimeLag() {
            if (process.env.INSTALL_PATH !== undefined) {
                // if in testing...
                return 2 * 1000;
            }
            return FAUNADB_TOKEN_TIME_LAG_MILLI;
        }

        let accessTokenLifetime = await this.originalImplementation.getAccessTokenLifeTimeMS.bind(this)();
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
        }: {
            res: BaseResponse;
            userId: string;
            accessTokenPayload?: any;
            sessionData?: any;
        }
    ): Promise<FaunaDBSessionContainer> {
        let fdat = await this.getFDAT(userId);
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
            await this.originalImplementation.createNewSession.bind(this)({
                res,
                userId,
                accessTokenPayload,
                sessionData,
            })
        );
    };

    getSession = async function (
        this: RecipeImplementation,
        {
            req,
            res,
            options,
        }: {
            req: BaseRequest;
            res: BaseResponse;
            options?: VerifySessionOptions;
        }
    ): Promise<FaunaDBSessionContainer | undefined> {
        let originalSession = await this.originalImplementation.getSession.bind(this)({ req, res, options });
        if (originalSession === undefined) {
            return undefined;
        }
        return getModifiedSession(originalSession);
    };

    getSessionInformation = function (
        this: RecipeImplementation,
        { sessionHandle }: { sessionHandle: string }
    ): Promise<SessionInformation> {
        return this.originalImplementation.getSessionInformation.bind(this)({ sessionHandle });
    };

    refreshSession = async function (
        this: RecipeImplementation,
        {
            req,
            res,
        }: {
            req: BaseRequest;
            res: BaseResponse;
        }
    ): Promise<FaunaDBSessionContainer> {
        let originalSession = await this.originalImplementation.refreshSession.bind(this)({ req, res });
        let session = getModifiedSession(originalSession);
        let fdat = await this.getFDAT(session.getUserId());

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

    revokeAllSessionsForUser = function (this: RecipeImplementation, { userId }: { userId: string }) {
        return this.originalImplementation.revokeAllSessionsForUser.bind(this)({ userId });
    };

    getAllSessionHandlesForUser = function (
        this: RecipeImplementation,
        { userId }: { userId: string }
    ): Promise<string[]> {
        return this.originalImplementation.getAllSessionHandlesForUser.bind(this)({ userId });
    };

    revokeSession = function (
        this: RecipeImplementation,
        { sessionHandle }: { sessionHandle: string }
    ): Promise<boolean> {
        return this.originalImplementation.revokeSession.bind(this)({ sessionHandle });
    };

    revokeMultipleSessions = function (this: RecipeImplementation, { sessionHandles }: { sessionHandles: string[] }) {
        return this.originalImplementation.revokeMultipleSessions.bind(this)({ sessionHandles });
    };

    updateSessionData = function (
        this: RecipeImplementation,
        { sessionHandle, newSessionData }: { sessionHandle: string; newSessionData: any }
    ) {
        return this.originalImplementation.updateSessionData.bind(this)({ sessionHandle, newSessionData });
    };

    updateAccessTokenPayload = function (
        this: RecipeImplementation,
        input: { sessionHandle: string; newAccessTokenPayload: any }
    ) {
        return this.originalImplementation.updateAccessTokenPayload.bind(this)(input);
    };

    getAccessTokenLifeTimeMS = async function (this: RecipeImplementation): Promise<number> {
        return this.originalImplementation.getAccessTokenLifeTimeMS.bind(this)();
    };

    getRefreshTokenLifeTimeMS = async function (this: RecipeImplementation): Promise<number> {
        return this.originalImplementation.getRefreshTokenLifeTimeMS.bind(this)();
    };
}

function getModifiedSession(session: SessionContainer): FaunaDBSessionContainer {
    return {
        ...session,
        getFaunadbToken: async (): Promise<string> => {
            let accessTokenPayload = session.getAccessTokenPayload();
            if (accessTokenPayload[FAUNADB_SESSION_KEY] !== undefined) {
                // this operation costs nothing. So we can check
                return accessTokenPayload[FAUNADB_SESSION_KEY];
            } else {
                let sessionData = await session.getSessionData();
                return sessionData[FAUNADB_SESSION_KEY];
            }
        },
    };
}
