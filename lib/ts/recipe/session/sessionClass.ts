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
import * as express from "express";
import SessionRecipe from "./sessionRecipe";
import * as SessionFunctions from "./sessionFunctions";
import { attachAccessTokenToCookie, clearSessionFromCookie, setFrontTokenInHeaders } from "./cookieAndHeaders";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";

export default class Session {
    private sessionHandle: string;
    private userId: string;
    private userDataInJWT: any;
    private res: express.Response;
    private accessToken: string;
    private recipeInstance: SessionRecipe;

    constructor(
        recipeInstance: SessionRecipe,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInJWT: any,
        res: express.Response
    ) {
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInJWT = userDataInJWT;
        this.res = res;
        this.accessToken = accessToken;
        this.recipeInstance = recipeInstance;
    }

    revokeSession = async () => {
        if (await SessionFunctions.revokeSession(this.recipeInstance, this.sessionHandle)) {
            clearSessionFromCookie(this.recipeInstance, this.res);
        }
    };

    getSessionData = async (): Promise<any> => {
        try {
            return await SessionFunctions.getSessionData(this.recipeInstance, this.sessionHandle);
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.recipeInstance, this.res);
            }
            throw err;
        }
    };

    updateSessionData = async (newSessionData: any) => {
        try {
            await SessionFunctions.updateSessionData(this.recipeInstance, this.sessionHandle, newSessionData);
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.recipeInstance, this.res);
            }
            throw err;
        }
    };

    getUserId = () => {
        return this.userId;
    };

    getJWTPayload = () => {
        return this.userDataInJWT;
    };

    getHandle = () => {
        return this.sessionHandle;
    };

    getAccessToken = () => {
        return this.accessToken;
    };

    updateJWTPayload = async (newJWTPayload: any) => {
        newJWTPayload = newJWTPayload === null || newJWTPayload === undefined ? {} : newJWTPayload;
        let response = await this.recipeInstance
            .getQuerier()
            .sendPostRequest(new NormalisedURLPath(this.recipeInstance.getRecipeId(), "/recipe/session/regenerate"), {
                accessToken: this.accessToken,
                userDataInJWT: newJWTPayload,
            });
        if (response.status === "UNAUTHORISED") {
            clearSessionFromCookie(this.recipeInstance, this.res);
            throw new STError(
                {
                    message: "Session has probably been revoked while updating JWT payload",
                    type: STError.UNAUTHORISED,
                },
                this.recipeInstance.getRecipeId()
            );
        }
        this.userDataInJWT = response.session.userDataInJWT;
        if (response.accessToken !== undefined) {
            this.accessToken = response.accessToken.token;
            setFrontTokenInHeaders(
                this.recipeInstance,
                this.res,
                response.session.userId,
                response.accessToken.expiry,
                response.session.userDataInJWT
            );
            attachAccessTokenToCookie(
                this.recipeInstance,
                this.res,
                response.accessToken.token,
                response.accessToken.expiry
            );
        }
    };
}
