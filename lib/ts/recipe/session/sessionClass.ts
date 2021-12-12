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
import { BaseResponse } from "../../framework";
import * as SessionFunctions from "./sessionFunctions";
import { attachAccessTokenToCookie, clearSessionFromCookie, setFrontTokenInHeaders } from "./cookieAndHeaders";
import STError from "./error";
import NormalisedURLPath from "../../normalisedURLPath";
import { SessionContainerInterface } from "./types";
import { Helpers } from "./recipeImplementation";

export default class Session implements SessionContainerInterface {
    protected sessionHandle: string;
    protected userId: string;
    protected userDataInAccessToken: any;
    protected res: BaseResponse;
    protected accessToken: string;
    protected helpers: Helpers;

    constructor(
        helpers: Helpers,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        res: BaseResponse
    ) {
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInAccessToken = userDataInAccessToken;
        this.res = res;
        this.accessToken = accessToken;
        this.helpers = helpers;
    }

    revokeSession = async (_: any = {}) => {
        if (await SessionFunctions.revokeSession(this.helpers, this.sessionHandle)) {
            clearSessionFromCookie(this.helpers.config, this.res);
        }
    };

    getSessionData = async (_: any = {}): Promise<any> => {
        try {
            return (await SessionFunctions.getSessionInformation(this.helpers, this.sessionHandle)).sessionData;
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
    };

    updateSessionData = async (newSessionData: any, _: any = {}) => {
        try {
            await SessionFunctions.updateSessionData(this.helpers, this.sessionHandle, newSessionData);
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
    };

    getUserId = () => {
        return this.userId;
    };

    getAccessTokenPayload = () => {
        return this.userDataInAccessToken;
    };

    getHandle = () => {
        return this.sessionHandle;
    };

    getAccessToken = () => {
        return this.accessToken;
    };

    updateAccessTokenPayload = async (newAccessTokenPayload: any, _: any = {}) => {
        newAccessTokenPayload =
            newAccessTokenPayload === null || newAccessTokenPayload === undefined ? {} : newAccessTokenPayload;
        let response = await this.helpers.querier.sendPostRequest(new NormalisedURLPath("/recipe/session/regenerate"), {
            accessToken: this.accessToken,
            userDataInJWT: newAccessTokenPayload,
        });
        if (response.status === "UNAUTHORISED") {
            clearSessionFromCookie(this.helpers.config, this.res);
            throw new STError({
                message: "Session has probably been revoked while updating access token payload",
                type: STError.UNAUTHORISED,
            });
        }
        this.userDataInAccessToken = response.session.userDataInJWT;
        if (response.accessToken !== undefined) {
            this.accessToken = response.accessToken.token;
            setFrontTokenInHeaders(
                this.res,
                response.session.userId,
                response.accessToken.expiry,
                response.session.userDataInJWT
            );
            attachAccessTokenToCookie(
                this.helpers.config,
                this.res,
                response.accessToken.token,
                response.accessToken.expiry
            );
        }
    };

    getTimeCreated = async (_: any = {}): Promise<number> => {
        try {
            return (await SessionFunctions.getSessionInformation(this.helpers, this.sessionHandle)).timeCreated;
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
    };

    getExpiry = async (_: any = {}): Promise<number> => {
        try {
            return (await SessionFunctions.getSessionInformation(this.helpers, this.sessionHandle)).expiry;
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
    };
}
