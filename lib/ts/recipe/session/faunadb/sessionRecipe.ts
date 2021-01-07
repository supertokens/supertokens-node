/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import OriginalSessionRecipe from "../sessionRecipe";
import * as express from "express";
import { TypeFaunaDBInput } from "./types";
import STError from "../error";
import * as faunadb from "faunadb";
import Session from "./sessionClass";
import RecipeModule from "../../../recipeModule";
import { NormalisedAppinfo, RecipeListFunction } from "../../../types";
import OriginalSessionClass from "../sessionClass";
import { FAUNADB_SESSION_KEY, FAUNADB_TOKEN_TIME_LAG_MILLI } from "./constants";

// For Express
export default class SessionRecipe extends RecipeModule {
    private static instance: SessionRecipe | undefined = undefined;

    parentRecipe: OriginalSessionRecipe;

    config: {
        faunadbSecret: string;
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
    };

    superCreateNewSession: (
        res: express.Response,
        userId: string,
        jwtPayload?: any,
        sessionData?: any
    ) => Promise<OriginalSessionClass>;

    superGetSession: (
        req: express.Request,
        res: express.Response,
        doAntiCsrfCheck: boolean
    ) => Promise<OriginalSessionClass>;

    superRefreshSession: (req: express.Request, res: express.Response) => Promise<OriginalSessionClass>;

    q = faunadb.query;
    faunaDBClient: faunadb.Client;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeFaunaDBInput) {
        super(recipeId, appInfo);

        this.parentRecipe = new OriginalSessionRecipe(recipeId, appInfo, config);

        // we save the parent recipe's functions here, so that they can be used later
        this.superCreateNewSession = this.parentRecipe.createNewSession;
        this.superGetSession = this.parentRecipe.getSession;
        this.superRefreshSession = this.parentRecipe.refreshSession;

        // we override the parent recipe's functions with the modified ones.
        this.parentRecipe.createNewSession = this.createNewSession;
        this.parentRecipe.getSession = this.getSession;
        this.parentRecipe.refreshSession = this.refreshSession;

        this.config = {
            faunadbSecret: config.faunadbSecret,
            accessFaunadbTokenFromFrontend:
                config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend,
            userCollectionName: config.userCollectionName,
        };

        try {
            this.faunaDBClient = new faunadb.Client({
                secret: this.config.faunadbSecret,
            });
        } catch (err) {
            throw new STError(
                {
                    payload: err,
                    type: STError.GENERAL_ERROR,
                },
                this.getRecipeId()
            );
        }
    }

    static getInstanceOrThrowError(): SessionRecipe {
        if (SessionRecipe.instance !== undefined) {
            return SessionRecipe.instance;
        }
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
            },
            OriginalSessionRecipe.RECIPE_ID
        );
    }

    static init(config: TypeFaunaDBInput): RecipeListFunction {
        return (appInfo) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(OriginalSessionRecipe.RECIPE_ID, appInfo, config);
                return SessionRecipe.instance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "Session recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    OriginalSessionRecipe.RECIPE_ID
                );
            }
        };
    }

    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: new Error("calling testing function in non testing env"),
                },
                OriginalSessionRecipe.RECIPE_ID
            );
        }
        SessionRecipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = () => {
        return this.parentRecipe.getAPIsHandled();
    };

    handleAPIRequest = (id: string, req: express.Request, res: express.Response, next: express.NextFunction) => {
        return this.parentRecipe.handleAPIRequest(id, req, res, next);
    };

    handleError = (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => {
        return this.parentRecipe.handleError(err, request, response, next);
    };

    getAllCORSHeaders = (): string[] => {
        return this.parentRecipe.getAllCORSHeaders();
    };

    // instance functions.........

    getFDAT = async (session: Session) => {
        function getFaunadbTokenTimeLag() {
            if (process.env.INSTALL_PATH !== undefined) {
                // if in testing...
                return 2 * 1000;
            }
            return FAUNADB_TOKEN_TIME_LAG_MILLI;
        }

        let accessTokenLifetime = (await this.parentRecipe.getHandshakeInfo()).accessTokenValidity;

        let faunaResponse: any = await this.faunaDBClient.query(
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
        let originalSession = await this.superCreateNewSession(res, userId, jwtPayload, sessionData);
        let session = new Session(
            this.parentRecipe,
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
                this.getRecipeId()
            );
        }
    };

    getSession = async (req: express.Request, res: express.Response, doAntiCsrfCheck: boolean): Promise<Session> => {
        let originalSession = await this.superGetSession(req, res, doAntiCsrfCheck);
        return new Session(
            this.parentRecipe,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            res
        );
    };

    refreshSession = async (req: express.Request, res: express.Response): Promise<Session> => {
        let originalSession = await this.superRefreshSession(req, res);
        let session = new Session(
            this.parentRecipe,
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
                this.getRecipeId()
            );
        }
    };
}
