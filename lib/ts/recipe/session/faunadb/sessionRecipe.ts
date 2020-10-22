/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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

export const FAUNADB_TOKEN_TIME_LAG_MILLI = 30 * 1000;
export const FAUNADB_SESSION_KEY = "faunadbToken";
const q = faunadb.query;
let faunaDBClient: faunadb.Client;

// For Express
export default class SessionRecipe extends OriginalSessionRecipe {
    private static faunaSessionRecipeInstance: SessionRecipe | undefined = undefined;

    faunaConfig: {
        faunadbSecret: string;
        accessFaunadbTokenFromFrontend: boolean;
        userCollectionName: string;
    };

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeFaunaDBInput) {
        super(recipeId, appInfo, config);
        this.faunaConfig = {
            faunadbSecret: config.faunadbSecret,
            accessFaunadbTokenFromFrontend:
                config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend,
            userCollectionName: config.userCollectionName,
        };
    }

    static getInstanceOrThrowError(): SessionRecipe {
        if (SessionRecipe.faunaSessionRecipeInstance !== undefined) {
            return SessionRecipe.faunaSessionRecipeInstance;
        }
        throw new STError(
            {
                type: STError.GENERAL_ERROR,
                payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
            },
            SessionRecipe.RECIPE_ID
        );
    }

    static init(config: TypeFaunaDBInput): RecipeListFunction {
        return (appInfo) => {
            if (SessionRecipe.faunaSessionRecipeInstance === undefined) {
                SessionRecipe.faunaSessionRecipeInstance = new SessionRecipe("session", appInfo, config);
                return SessionRecipe.faunaSessionRecipeInstance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "Session recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    SessionRecipe.RECIPE_ID
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
                SessionRecipe.RECIPE_ID
            );
        }
        SessionRecipe.faunaSessionRecipeInstance = undefined;
    }

    // instance functions.........

    getFDAT = async (session: Session) => {
        function getFaunadbTokenTimeLag() {
            if (process.env.INSTALL_PATH !== undefined) {
                // if in testing...
                return 2 * 1000;
            }
            return FAUNADB_TOKEN_TIME_LAG_MILLI;
        }

        let accessTokenExpiry = session.getAccessTokenExpiry();
        if (accessTokenExpiry === undefined) {
            throw new Error("Should not come here");
        }
        let accessTokenLifetime = accessTokenExpiry - Date.now();

        let faunaResponse: any = await faunaDBClient.query(
            q.Create(q.Tokens(), {
                instance: q.Ref(q.Collection(this.faunaConfig.userCollectionName), session.getUserId()),
                ttl: q.TimeAdd(q.Now(), accessTokenLifetime + getFaunadbTokenTimeLag(), "millisecond"),
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
            this,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            originalSession.getAccessTokenExpiry(), // TODO: remove this field from session once handshake info has access token expiry
            res
        );
        try {
            let fdat = await this.getFDAT(session);

            if (this.faunaConfig.accessFaunadbTokenFromFrontend) {
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
        let originalSession = await super.getSession(req, res, doAntiCsrfCheck);
        return new Session(
            this,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            originalSession.getAccessTokenExpiry(),
            res
        );
    };

    refreshSession = async (req: express.Request, res: express.Response): Promise<Session> => {
        let originalSession = await super.refreshSession(req, res);
        let session = new Session(
            this,
            originalSession.getAccessToken(),
            originalSession.getHandle(),
            originalSession.getUserId(),
            originalSession.getJWTPayload(),
            originalSession.getAccessTokenExpiry(),
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
