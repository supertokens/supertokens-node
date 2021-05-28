import { VerifySessionOptions, RecipeInterface } from "../";
import * as express from "express";
import Session from "./sessionClass";
import * as faunadb from "faunadb";
import { FAUNADB_SESSION_KEY, FAUNADB_TOKEN_TIME_LAG_MILLI } from "./constants";
import { RecipeImplementation as OriginalRecipeImplementation } from "../";

export default class RecipeImplementation implements RecipeInterface {
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
        faunaDBClient: faunadb.Client;
    };

    q = faunadb.query;

    originalImplementation: OriginalRecipeImplementation;

    constructor(
        originalImplementation: OriginalRecipeImplementation,
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

    getFDAT = async (session: Session) => {
        function getFaunadbTokenTimeLag() {
            if (process.env.INSTALL_PATH !== undefined) {
                // if in testing...
                return 2 * 1000;
            }
            return FAUNADB_TOKEN_TIME_LAG_MILLI;
        }

        let accessTokenLifetime = (await this.originalImplementation.getHandshakeInfo()).accessTokenValidity;
        let faunaResponse: any = await this.config.faunaDBClient.query(
            this.q.Create(this.q.Tokens(), {
                instance: this.q.Ref(this.q.Collection(this.config.userCollectionName), session.getUserId()),
                ttl: this.q.TimeAdd(this.q.Now(), accessTokenLifetime + getFaunadbTokenTimeLag(), "millisecond"),
            })
        );
        return faunaResponse.secret;
    };

    createNewSession = async (
        res: express.Response,
        userId: string,
        jwtPayload: any = {},
        sessionData: any = {}
    ): Promise<Session> => {
        // TODO: HandshakeInfo should give the access token lifetime so that we do not have to do a double query
        let originalSession = await this.originalImplementation.createNewSession(res, userId, jwtPayload, sessionData);
        let session = new Session(
            this.originalImplementation,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
        let fdat = await this.getFDAT(session);

        if (this.config.accessFaunadbTokenFromFrontend) {
            let newPayload = {
                ...jwtPayload,
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateJWTPayload(newPayload);
        } else {
            let newPayload = {
                ...sessionData,
            };
            newPayload[FAUNADB_SESSION_KEY] = fdat;
            await session.updateSessionData(newPayload);
        }

        return session;
    };

    getSession = async (
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions
    ): Promise<Session | undefined> => {
        let originalSession = await this.originalImplementation.getSession(req, res, options);
        if (originalSession === undefined) {
            return undefined;
        }
        return new Session(
            this.originalImplementation,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
    };

    refreshSession = async (req: express.Request, res: express.Response): Promise<Session> => {
        let originalSession = await this.originalImplementation.refreshSession(req, res);
        let session = new Session(
            this.originalImplementation,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
        let fdat = await this.getFDAT(session);

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

    revokeAllSessionsForUser = (userId: string) => {
        return this.originalImplementation.revokeAllSessionsForUser(userId);
    };

    getAllSessionHandlesForUser = (userId: string): Promise<string[]> => {
        return this.originalImplementation.getAllSessionHandlesForUser(userId);
    };

    revokeSession = (sessionHandle: string): Promise<boolean> => {
        return this.originalImplementation.revokeSession(sessionHandle);
    };

    revokeMultipleSessions = (sessionHandles: string[]) => {
        return this.originalImplementation.revokeMultipleSessions(sessionHandles);
    };

    getSessionData = (sessionHandle: string): Promise<any> => {
        return this.originalImplementation.getSessionData(sessionHandle);
    };

    updateSessionData = (sessionHandle: string, newSessionData: any) => {
        return this.originalImplementation.updateSessionData(sessionHandle, newSessionData);
    };

    getJWTPayload = (sessionHandle: string): Promise<any> => {
        return this.originalImplementation.getJWTPayload(sessionHandle);
    };

    updateJWTPayload = (sessionHandle: string, newJWTPayload: any) => {
        return this.originalImplementation.updateJWTPayload(sessionHandle, newJWTPayload);
    };
}
