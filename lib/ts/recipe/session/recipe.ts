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

import RecipeModule from "../../recipeModule";
import { TypeInput, TypeNormalisedInput, RecipeInterface } from "./types";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import { HandshakeInfo } from "./types";
import * as express from "express";
import { NormalisedAppinfo, RecipeListFunction, APIHandled, HTTPMethod } from "../../types";
import handleRefreshAPI from "./api/refresh";
import signOutAPI from "./api/signout";
import { SERVERLESS_CACHE_HANDSHAKE_INFO_FILE_PATH, REFRESH_API_PATH, SIGNOUT_API_PATH } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import { getDataFromFileForServerlessCache, storeIntoTempFolderForServerlessCache } from "../../utils";
import { PROCESS_STATE, ProcessState } from "../../processState";
import { getCORSAllowedHeaders as getCORSAllowedHeadersFromCookiesAndHeaders } from "./cookieAndHeaders";
import RecipeImplementation from "./recipeImplementation";

// For Express
export default class SessionRecipe extends RecipeModule {
    private static instance: SessionRecipe | undefined = undefined;
    static RECIPE_ID = "session";

    config: TypeNormalisedInput;

    handshakeInfo: HandshakeInfo | undefined = undefined;

    recipeInterfaceImpl: RecipeInterface;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo, isInServerlessEnv);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.recipeInterfaceImpl = this.config.override.functions(new RecipeImplementation(this));

        // Solving the cold start problem
        this.getHandshakeInfo().catch((_) => {
            // ignored
        });
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
            undefined
        );
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (appInfo, isInServerlessEnv) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(SessionRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return SessionRecipe.instance;
            } else {
                throw new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: new Error(
                            "Session recipe has already been initialised. Please check your code for bugs."
                        ),
                    },
                    undefined
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
                undefined
            );
        }
        SessionRecipe.instance = undefined;
    }

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this, REFRESH_API_PATH),
                id: REFRESH_API_PATH,
                disabled: this.config.sessionRefreshFeature.disableDefaultImplementation,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(this, SIGNOUT_API_PATH),
                id: SIGNOUT_API_PATH,
                disabled: this.config.signOutFeature.disableDefaultImplementation,
            },
        ];
    };

    handleAPIRequest = async (
        id: string,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        __: NormalisedURLPath,
        ___: HTTPMethod
    ) => {
        if (id === REFRESH_API_PATH) {
            return await handleRefreshAPI(this, req, res, next);
        } else {
            return await signOutAPI(this, req, res, next);
        }
    };

    handleError = (err: STError, request: express.Request, response: express.Response, next: express.NextFunction) => {
        if (err.type === STError.UNAUTHORISED) {
            return this.config.errorHandlers.onUnauthorised(err.message, request, response, next);
        } else if (err.type === STError.TRY_REFRESH_TOKEN) {
            return this.config.errorHandlers.onTryRefreshToken(err.message, request, response, next);
        } else if (err.type === STError.TOKEN_THEFT_DETECTED) {
            return this.config.errorHandlers.onTokenTheftDetected(
                err.payload.sessionHandle,
                err.payload.userId,
                request,
                response,
                next
            );
        } else {
            return next(err);
        }
    };

    getAllCORSHeaders = (): string[] => {
        return getCORSAllowedHeadersFromCookiesAndHeaders();
    };

    isErrorFromThisOrChildRecipeBasedOnInstance = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && this === err.recipe;
    };

    // helper functions below....

    getHandshakeInfo = async (): Promise<HandshakeInfo> => {
        if (this.handshakeInfo === undefined) {
            let antiCsrf = this.config.antiCsrf;
            if (this.checkIfInServerlessEnv()) {
                let handshakeInfo = await getDataFromFileForServerlessCache<HandshakeInfo>(
                    SERVERLESS_CACHE_HANDSHAKE_INFO_FILE_PATH
                );
                if (handshakeInfo !== undefined) {
                    handshakeInfo = {
                        ...handshakeInfo,
                        antiCsrf,
                    };
                    this.handshakeInfo = handshakeInfo;
                    return this.handshakeInfo;
                }
            }
            ProcessState.getInstance().addState(PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO);
            let response = await this.getQuerier().sendPostRequest(
                new NormalisedURLPath(this, "/recipe/handshake"),
                {}
            );
            this.handshakeInfo = {
                jwtSigningPublicKey: response.jwtSigningPublicKey,
                antiCsrf,
                accessTokenBlacklistingEnabled: response.accessTokenBlacklistingEnabled,
                jwtSigningPublicKeyExpiryTime: response.jwtSigningPublicKeyExpiryTime,
                accessTokenValidity: response.accessTokenValidity,
                refreshTokenValidity: response.refreshTokenValidity,
            };
            if (this.checkIfInServerlessEnv()) {
                storeIntoTempFolderForServerlessCache(SERVERLESS_CACHE_HANDSHAKE_INFO_FILE_PATH, this.handshakeInfo);
            }
        }
        return this.handshakeInfo;
    };

    updateJwtSigningPublicKeyInfo = (newKey: string, newExpiry: number) => {
        if (this.handshakeInfo !== undefined) {
            this.handshakeInfo.jwtSigningPublicKey = newKey;
            this.handshakeInfo.jwtSigningPublicKeyExpiryTime = newExpiry;
        }
    };
}
