import { VerifySessionOptions } from "../types";
import Recipe from "../sessionRecipe";
import OriginalRecipeImplementation from "../recipeImplementation";
import * as express from "express";
import Session from "./sessionClass";
import STError from "../error";
import * as faunadb from "faunadb";
import { FAUNADB_SESSION_KEY, FAUNADB_TOKEN_TIME_LAG_MILLI } from "./constants";

export default class RecipeImplementation extends OriginalRecipeImplementation {
    config: {
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
        faunaDBClient: faunadb.Client;
    };

    q = faunadb.query;

    constructor(
        recipeInstance: Recipe,
        config: {
            accessFaunadbTokenFromFrontend?: boolean;
            userCollectionName: string;
            faunadbClient: faunadb.Client;
        }
    ) {
        super(recipeInstance);
        this.config = {
            accessFaunadbTokenFromFrontend:
                config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend,
            userCollectionName: config.userCollectionName,
            faunaDBClient: config.faunadbClient,
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

        let accessTokenLifetime = (await this.recipeInstance.getHandshakeInfo()).accessTokenValidity;

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
        let originalSession = await super.createNewSession(res, userId, jwtPayload, sessionData);
        let session = new Session(
            this.recipeInstance,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
        try {
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
        } catch (err) {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: err,
                },
                this.recipeInstance
            );
        }
    };

    getSession = async (
        req: express.Request,
        res: express.Response,
        options?: VerifySessionOptions
    ): Promise<Session | undefined> => {
        let originalSession = await super.getSession(req, res, options);
        if (originalSession === undefined) {
            return undefined;
        }
        return new Session(
            this.recipeInstance,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
    };

    refreshSession = async (req: express.Request, res: express.Response): Promise<Session> => {
        let originalSession = await super.refreshSession(req, res);
        let session = new Session(
            this.recipeInstance,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
        try {
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
        } catch (err) {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: err,
                },
                this.recipeInstance
            );
        }
    };
}
