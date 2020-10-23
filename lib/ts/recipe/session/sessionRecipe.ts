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

import RecipeModule from "../../recipeModule";
import * as jwt from "jsonwebtoken";
import { TypeInput, TypeNormalisedInput, SessionRequest, Auth0RequestBody } from "./types";
import STError from "./error";
import Session from "./sessionClass";
import { validateAndNormaliseUserInput, attachCreateOrRefreshSessionResponseToExpressRes } from "./utils";
import { HandshakeInfo } from "./types";
import * as express from "express";
import * as SessionFunctions from "./sessionFunctions";
import * as qs from "querystring";
import {
    attachAccessTokenToCookie,
    clearSessionFromCookie,
    getAccessTokenFromCookie,
    getAntiCsrfTokenFromHeaders,
    getIdRefreshTokenFromCookie,
    getRefreshTokenFromCookie,
    getCORSAllowedHeaders as getCORSAllowedHeadersFromCookiesAndHeaders,
    setFrontTokenInHeaders,
} from "./cookieAndHeaders";
import axios from "axios";
import { NormalisedAppinfo, RecipeListFunction } from "../../types";

// For Express
export default class SessionRecipe extends RecipeModule {
    private static instance: SessionRecipe | undefined = undefined;
    static RECIPE_ID = "session";

    config: {
        accessTokenPath: string;
        refreshTokenPath: string;
        cookieDomain: string | undefined;
        cookieSecure: boolean;
        cookieSameSite: "strict" | "lax" | "none";
        sessionExpiredStatusCode: number;
        sessionRefreshFeature: {
            disableDefaultImplementation: boolean;
        };
    };

    handshakeInfo: HandshakeInfo | undefined = undefined;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput) {
        super(recipeId, appInfo);
        try {
            let normalisedInput: TypeNormalisedInput = validateAndNormaliseUserInput(config);

            this.config = {
                accessTokenPath: normalisedInput.accessTokenPath,
                refreshTokenPath: appInfo.apiBasePath + "/session/refresh",
                cookieDomain: normalisedInput.cookieDomain,
                cookieSecure: normalisedInput.cookieSecure,
                cookieSameSite: normalisedInput.cookieSameSite,
                sessionExpiredStatusCode: normalisedInput.sessionExpiredStatusCode,
                sessionRefreshFeature: normalisedInput.sessionRefreshFeature,
            };

            // Solving the cold start problem
            this.getHandshakeInfo().catch((ignored) => {
                // ignored
            });
        } catch (err) {
            throw new STError(
                {
                    type: STError.GENERAL_ERROR,
                    payload: err,
                },
                recipeId
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
            SessionRecipe.RECIPE_ID
        );
    }

    static init(config: TypeInput): RecipeListFunction {
        return (appInfo) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe("session", appInfo, config);
                return SessionRecipe.instance;
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
        SessionRecipe.instance = undefined;
    }

    // instance functions below...............

    getHandshakeInfo = async (): Promise<HandshakeInfo> => {
        if (this.handshakeInfo == undefined) {
            let response = await this.getQuerier().sendPostRequest("/handshake", {});
            this.handshakeInfo = {
                jwtSigningPublicKey: response.jwtSigningPublicKey,
                enableAntiCsrf: response.enableAntiCsrf,
                accessTokenBlacklistingEnabled: response.accessTokenBlacklistingEnabled,
                jwtSigningPublicKeyExpiryTime: response.jwtSigningPublicKeyExpiryTime,
                accessTokenVaildity: response.accessTokenVaildity,
                refreshTokenVaildity: response.refreshTokenVaildity,
            };
        }
        return this.handshakeInfo;
    };

    updateJwtSigningPublicKeyInfo = (newKey: string, newExpiry: number) => {
        if (this.handshakeInfo !== undefined) {
            this.handshakeInfo.jwtSigningPublicKey = newKey;
            this.handshakeInfo.jwtSigningPublicKeyExpiryTime = newExpiry;
        }
    };

    createNewSession = async (
        res: express.Response,
        userId: string,
        jwtPayload: any = {},
        sessionData: any = {}
    ): Promise<Session> => {
        let response = await SessionFunctions.createNewSession(this, userId, jwtPayload, sessionData);
        attachCreateOrRefreshSessionResponseToExpressRes(this, res, response);
        return new Session(
            this,
            response.accessToken.token,
            response.session.handle,
            response.session.userId,
            response.session.userDataInJWT,
            response.accessToken.expiry,
            res
        );
    };

    getSession = async (req: express.Request, res: express.Response, doAntiCsrfCheck: boolean): Promise<Session> => {
        let idRefreshToken = getIdRefreshTokenFromCookie(req);
        if (idRefreshToken === undefined) {
            // we do not clear cookies here because of a
            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

            throw new STError(
                {
                    message: "Session does not exist. Are you sending the session tokens in the request as cookies?",
                    type: STError.UNAUTHORISED,
                },
                this.getRecipeId()
            );
        }
        let accessToken = getAccessTokenFromCookie(req);
        if (accessToken === undefined) {
            // maybe the access token has expired.
            throw new STError(
                {
                    message: "Access token has expired. Please call the refresh API",
                    type: STError.TRY_REFRESH_TOKEN,
                },
                this.getRecipeId()
            );
        }
        try {
            let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
            let response = await SessionFunctions.getSession(this, accessToken, antiCsrfToken, doAntiCsrfCheck);
            if (response.accessToken !== undefined) {
                setFrontTokenInHeaders(
                    this,
                    res,
                    response.session.userId,
                    response.accessToken.expiry,
                    response.session.userDataInJWT
                );
                attachAccessTokenToCookie(this, res, response.accessToken.token, response.accessToken.expiry);
                accessToken = response.accessToken.token;
            }
            return new Session(
                this,
                accessToken,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                response.accessToken !== undefined ? response.accessToken.expiry : undefined,
                res
            );
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this, res);
            }
            throw err;
        }
    };

    refreshSession = async (req: express.Request, res: express.Response): Promise<Session> => {
        let inputRefreshToken = getRefreshTokenFromCookie(req);
        if (inputRefreshToken === undefined) {
            // we do not clear cookies here because of a
            // race condition mentioned here: https://github.com/supertokens/supertokens-node/issues/17

            throw new STError(
                {
                    message: "Refresh token not found. Are you sending the refresh token in the request as a cookie?",
                    type: STError.UNAUTHORISED,
                },
                this.getRecipeId()
            );
        }

        try {
            let antiCsrfToken = getAntiCsrfTokenFromHeaders(req);
            let response = await SessionFunctions.refreshSession(this, inputRefreshToken, antiCsrfToken);
            attachCreateOrRefreshSessionResponseToExpressRes(this, res, response);
            return new Session(
                this,
                response.accessToken.token,
                response.session.handle,
                response.session.userId,
                response.session.userDataInJWT,
                response.accessToken.expiry,
                res
            );
        } catch (err) {
            if (err.type === STError.UNAUTHORISED || err.type === STError.TOKEN_THEFT_DETECTED) {
                clearSessionFromCookie(this, res);
            }
            throw err;
        }
    };

    revokeAllSessionsForUser = (userId: string) => {
        return SessionFunctions.revokeAllSessionsForUser(this, userId);
    };

    getAllSessionHandlesForUser = (userId: string): Promise<string[]> => {
        return SessionFunctions.getAllSessionHandlesForUser(this, userId);
    };

    revokeSession = (sessionHandle: string): Promise<boolean> => {
        return SessionFunctions.revokeSession(this, sessionHandle);
    };

    revokeMultipleSessions = (sessionHandles: string[]) => {
        return SessionFunctions.revokeMultipleSessions(this, sessionHandles);
    };

    getSessionData = (sessionHandle: string): Promise<any> => {
        return SessionFunctions.getSessionData(this, sessionHandle);
    };

    updateSessionData = (sessionHandle: string, newSessionData: any) => {
        return SessionFunctions.updateSessionData(this, sessionHandle, newSessionData);
    };

    getCORSAllowedHeaders = (): string[] => {
        return getCORSAllowedHeadersFromCookiesAndHeaders();
    };

    getJWTPayload = (sessionHandle: string): Promise<any> => {
        return SessionFunctions.getJWTPayload(this, sessionHandle);
    };

    updateJWTPayload = (sessionHandle: string, newJWTPayload: any) => {
        return SessionFunctions.updateJWTPayload(this, sessionHandle, newJWTPayload);
    };

    auth0Handler = async (
        request: SessionRequest,
        response: express.Response,
        next: express.NextFunction,
        domain: string,
        clientId: string,
        clientSecret: string,
        callback?: (
            userId: string,
            idToken: string,
            accessToken: string,
            refreshToken: string | undefined
        ) => Promise<void>
    ) => {
        try {
            let requestBody: Auth0RequestBody = request.body;
            if (requestBody.action === "logout") {
                if (request.session === undefined) {
                    request.session = await this.getSession(request, response, true);
                }
                await request.session.revokeSession();
                return response.json({});
            }
            let authCode = requestBody.code;
            let redirectURI = requestBody.redirect_uri;
            if (requestBody.action !== "login") {
                request.session = await this.getSession(request, response, true);
            }

            let formData = {};
            if (authCode === undefined && requestBody.action === "refresh") {
                let sessionData = await request.session.getSessionData();
                if (sessionData.refresh_token === undefined) {
                    response.statusCode = 403;
                    return response.json({});
                }
                formData = {
                    grant_type: "refresh_token",
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: sessionData.refresh_token,
                };
            } else {
                formData = {
                    grant_type: "authorization_code",
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: authCode,
                    redirect_uri: redirectURI,
                };
            }
            let auth0Response;
            try {
                auth0Response = await axios({
                    method: "post",
                    url: `https://${domain}/oauth/token`,
                    data: qs.stringify(formData),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });
            } catch (err) {
                if (err.response !== undefined && err.response.status < 500) {
                    response.statusCode = err.response.status;
                    return response.json({});
                }
                throw err;
            }
            let idToken = auth0Response.data.id_token;
            let expiresIn = auth0Response.data.expires_in;
            let accessToken = auth0Response.data.access_token;
            let refreshToken = auth0Response.data.refresh_token;

            if (requestBody.action === "login") {
                let payload = jwt.decode(idToken, { json: true });
                if (payload === null) {
                    throw Error("invalid payload while decoding auth0 idToken");
                }
                if (callback !== undefined) {
                    await callback(payload.sub, idToken, accessToken, refreshToken);
                } else {
                    await this.createNewSession(
                        response,
                        payload.sub,
                        {},
                        {
                            refresh_token: refreshToken,
                        }
                    );
                }
            } else if (authCode !== undefined) {
                let sessionData = await request.session.getSessionData();
                sessionData.refresh_token = refreshToken;
                await request.session.updateSessionData(sessionData);
            }
            return response.json({
                id_token: idToken,
                expires_in: expiresIn,
            });
        } catch (err) {
            next(
                new STError(
                    {
                        type: STError.GENERAL_ERROR,
                        payload: err,
                    },
                    this.getRecipeId()
                )
            );
        }
    };
}
