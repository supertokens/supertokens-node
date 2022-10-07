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
import { BaseRequest, BaseResponse } from "../../framework";
import { clearSession, setFrontTokenInHeaders, setToken } from "./cookieAndHeaders";
import STError from "./error";
import { SessionClaim, SessionClaimValidator, SessionContainerInterface } from "./types";
import { Helpers } from "./recipeImplementation";

export default class Session implements SessionContainerInterface {
    protected sessionHandle: string;
    protected userId: string;
    protected userDataInAccessToken: any;
    protected readonly req: BaseRequest;
    protected res: BaseResponse;
    protected accessToken: string;
    protected helpers: Helpers;

    constructor(
        helpers: Helpers,
        accessToken: string,
        sessionHandle: string,
        userId: string,
        userDataInAccessToken: any,
        res: BaseResponse,
        req: BaseRequest
    ) {
        this.sessionHandle = sessionHandle;
        this.userId = userId;
        this.userDataInAccessToken = userDataInAccessToken;
        this.req = req;
        this.res = res;
        this.accessToken = accessToken;
        this.helpers = helpers;
    }

    revokeSession = async (userContext?: any) => {
        await this.helpers.getRecipeImpl().revokeSession({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });

        // we do not check the output of calling revokeSession
        // before clearing the cookies because we are revoking the
        // current API request's session.
        // If we instead clear the cookies only when revokeSession
        // returns true, it can cause this kind of a bug:
        // https://github.com/supertokens/supertokens-node/issues/343
        clearSession(this.helpers.config, this.req, this.res, userContext);
    };

    getSessionData = async (userContext?: any): Promise<any> => {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            clearSession(this.helpers.config, this.req, this.res, userContext);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.sessionData;
    };

    updateSessionData = async (newSessionData: any, userContext?: any) => {
        if (
            !(await this.helpers.getRecipeImpl().updateSessionData({
                sessionHandle: this.sessionHandle,
                newSessionData,
                userContext: userContext === undefined ? {} : userContext,
            }))
        ) {
            clearSession(this.helpers.config, this.req, this.res, userContext);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
    };

    getUserId = (_userContext?: any) => {
        return this.userId;
    };

    getAccessTokenPayload = (_userContext?: any) => {
        return this.userDataInAccessToken;
    };

    getHandle = () => {
        return this.sessionHandle;
    };

    getAccessToken = () => {
        return this.accessToken;
    };

    mergeIntoAccessTokenPayload = async (accessTokenPayloadUpdate: any, userContext?: any) => {
        const updatedPayload = { ...this.getAccessTokenPayload(userContext), ...accessTokenPayloadUpdate };
        for (const key of Object.keys(accessTokenPayloadUpdate)) {
            if (accessTokenPayloadUpdate[key] === null) {
                delete updatedPayload[key];
            }
        }

        await this.updateAccessTokenPayload(updatedPayload, userContext);
    };

    getTimeCreated = async (userContext?: any): Promise<number> => {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            clearSession(this.helpers.config, this.req, this.res, userContext);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.timeCreated;
    };

    getExpiry = async (userContext?: any): Promise<number> => {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            clearSession(this.helpers.config, this.req, this.res, userContext);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.expiry;
    };

    assertClaims = async (claimValidators: SessionClaimValidator[], userContext?: any): Promise<void> => {
        let validateClaimResponse = await this.helpers.getRecipeImpl().validateClaims({
            accessTokenPayload: this.getAccessTokenPayload(userContext),
            userId: this.getUserId(userContext),
            claimValidators,
            userContext,
        });

        if (validateClaimResponse.accessTokenPayloadUpdate !== undefined) {
            await this.mergeIntoAccessTokenPayload(validateClaimResponse.accessTokenPayloadUpdate, userContext);
        }

        if (validateClaimResponse.invalidClaims.length !== 0) {
            throw new STError({
                type: "INVALID_CLAIMS",
                message: "INVALID_CLAIMS",
                payload: validateClaimResponse.invalidClaims,
            });
        }
    };

    fetchAndSetClaim = async <T>(claim: SessionClaim<T>, userContext?: any) => {
        const update = await claim.build(this.getUserId(userContext), userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    };

    setClaimValue = <T>(claim: SessionClaim<T>, value: T, userContext?: any) => {
        const update = claim.addToPayload_internal({}, value, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    };

    getClaimValue = async <T>(claim: SessionClaim<T>, userContext?: any) => {
        return claim.getValueFromPayload(await this.getAccessTokenPayload(userContext), userContext);
    };

    removeClaim = (claim: SessionClaim<any>, userContext?: any) => {
        const update = claim.removeFromPayloadByMerge_internal({}, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    };

    /**
     * @deprecated Use mergeIntoAccessTokenPayload
     */
    updateAccessTokenPayload = async (newAccessTokenPayload: any, userContext: any) => {
        let response = await this.helpers.getRecipeImpl().regenerateAccessToken({
            accessToken: this.getAccessToken(),
            newAccessTokenPayload,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (response === undefined) {
            clearSession(this.helpers.config, this.req, this.res, userContext);
            throw new STError({
                message: "Session does not exist anymore",
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
            setToken(
                this.helpers.config,
                this.req,
                this.res,
                "access",
                response.accessToken.token,
                // We set the expiration to 10 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
                // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
                // Even if the token is expired the presence of the token indicates that the user could have a valid refresh
                // Setting them to infinity would require special case handling on the frontend and just adding 10 years seems enough.
                Date.now() + 315360000000,
                userContext
            );
        }
    };
}
