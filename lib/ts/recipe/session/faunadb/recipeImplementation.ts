import { VerifySessionOptions, RecipeInterface } from "../";
import * as express from "express";
import { SessionContainer } from "../";
import * as faunadb from "faunadb";
import { FAUNADB_SESSION_KEY, FAUNADB_TOKEN_TIME_LAG_MILLI } from "./constants";
import { Session as FaunaDBSessionContainer } from "./types";

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

        let accessTokenLifetime = await this.originalImplementation.getAccessTokenLifeTimeMS();
        let faunaResponse: any = await this.config.faunaDBClient.query(
            this.q.Create(this.q.Tokens(), {
                instance: this.q.Ref(this.q.Collection(this.config.userCollectionName), userId),
                ttl: this.q.TimeAdd(this.q.Now(), accessTokenLifetime + getFaunadbTokenTimeLag(), "millisecond"),
            })
        );
        return faunaResponse.secret;
    };

    createNewSession = async ({
        res,
        userId,
        jwtPayload = {},
        sessionData = {},
    }: {
        res: express.Response;
        userId: string;
        jwtPayload?: any;
        sessionData?: any;
    }): Promise<FaunaDBSessionContainer> => {
        let fdat = await this.getFDAT(userId);
        if (this.config.accessFaunadbTokenFromFrontend) {
            jwtPayload = {
                ...jwtPayload,
            };
            jwtPayload[FAUNADB_SESSION_KEY] = fdat;
        } else {
            sessionData = {
                ...sessionData,
            };
            sessionData[FAUNADB_SESSION_KEY] = fdat;
        }

        return getModifiedSession(
            await this.originalImplementation.createNewSession({ res, userId, jwtPayload, sessionData })
        );
    };

    getSession = async ({
        req,
        res,
        options,
    }: {
        req: express.Request;
        res: express.Response;
        options?: VerifySessionOptions;
    }): Promise<FaunaDBSessionContainer | undefined> => {
        let originalSession = await this.originalImplementation.getSession({ req, res, options });
        if (originalSession === undefined) {
            return undefined;
        }
        return getModifiedSession(originalSession);
    };

    getSessionDetails = ({ sessionHandle }: { sessionHandle: string }): Promise<any> => {
        return this.originalImplementation.getSessionDetails({ sessionHandle });
    };

    refreshSession = async ({
        req,
        res,
    }: {
        req: express.Request;
        res: express.Response;
    }): Promise<FaunaDBSessionContainer> => {
        let originalSession = await this.originalImplementation.refreshSession({ req, res });
        let session = getModifiedSession(originalSession);
        let fdat = await this.getFDAT(session.getUserId());

        // we do not use the accessFaunaDBTokenFromFrontend boolean here so that
        // it can be changed without affecting existing sessions.
        if (session.getJWTPayload()[FAUNADB_SESSION_KEY] !== undefined) {
            let newPayload = {
                ...session.getJWTPayload(),
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateJWTPayload(newPayload);
        } else {
            let newPayload = {
                ...(await session.getSessionData()),
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateSessionData(newPayload);
        }

        return session;
    };

    revokeAllSessionsForUser = ({ userId }: { userId: string }) => {
        return this.originalImplementation.revokeAllSessionsForUser({ userId });
    };

    getAllSessionHandlesForUser = ({ userId }: { userId: string }): Promise<string[]> => {
        return this.originalImplementation.getAllSessionHandlesForUser({ userId });
    };

    revokeSession = ({ sessionHandle }: { sessionHandle: string }): Promise<boolean> => {
        return this.originalImplementation.revokeSession({ sessionHandle });
    };

    revokeMultipleSessions = ({ sessionHandles }: { sessionHandles: string[] }) => {
        return this.originalImplementation.revokeMultipleSessions({ sessionHandles });
    };

    getSessionData = ({ sessionHandle }: { sessionHandle: string }): Promise<any> => {
        return this.originalImplementation.getSessionData({ sessionHandle });
    };

    updateSessionData = ({ sessionHandle, newSessionData }: { sessionHandle: string; newSessionData: any }) => {
        return this.originalImplementation.updateSessionData({ sessionHandle, newSessionData });
    };

    getJWTPayload = (input: { sessionHandle: string }): Promise<any> => {
        return this.originalImplementation.getJWTPayload(input);
    };

    updateJWTPayload = (input: { sessionHandle: string; newJWTPayload: any }) => {
        return this.originalImplementation.updateJWTPayload(input);
    };

    getAccessTokenLifeTimeMS = async (): Promise<number> => {
        return this.originalImplementation.getAccessTokenLifeTimeMS();
    };

    getRefreshTokenLifeTimeMS = async (): Promise<number> => {
        return this.originalImplementation.getRefreshTokenLifeTimeMS();
    };
}

function getModifiedSession(session: SessionContainer): FaunaDBSessionContainer {
    return {
        ...session,
        getFaunadbToken: async (): Promise<string> => {
            let jwtPayload = session.getJWTPayload();
            if (jwtPayload[FAUNADB_SESSION_KEY] !== undefined) {
                // this operation costs nothing. So we can check
                return jwtPayload[FAUNADB_SESSION_KEY];
            } else {
                let sessionData = await session.getSessionData();
                return sessionData[FAUNADB_SESSION_KEY];
            }
        },
    };
}
