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
import { SessionClaim, SessionClaimValidator, SessionContainerInterface, TokenTransferMethod } from "./types";
import { Helpers } from "./recipeImplementation";

const protectedProps = [
    "sub",
    "iat",
    "exp",
    "sessionHandle",
    "parentRefreshTokenHash1",
    "refreshTokenHash1",
    "antiCsrfToken",
];

export default class Session implements SessionContainerInterface {
    constructor(
        protected helpers: Helpers,
        protected accessToken: string,
        protected sessionHandle: string,
        protected userId: string,
        protected userDataInAccessToken: any,
        protected res: BaseResponse,
        protected readonly req: BaseRequest,
        protected readonly transferMethod: TokenTransferMethod
    ) {}

    async revokeSession(userContext?: any) {
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
        clearSession(this.helpers.config, this.res, this.transferMethod);
    }

    async getSessionData(userContext?: any): Promise<any> {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.sessionData;
    }

    async updateSessionData(newSessionData: any, userContext?: any) {
        if (
            !(await this.helpers.getRecipeImpl().updateSessionData({
                sessionHandle: this.sessionHandle,
                newSessionData,
                userContext: userContext === undefined ? {} : userContext,
            }))
        ) {
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
    }

    getUserId(_userContext?: any) {
        return this.userId;
    }

    getAccessTokenPayload(_userContext?: any) {
        return this.userDataInAccessToken;
    }

    getHandle() {
        return this.sessionHandle;
    }

    getAccessToken() {
        return this.accessToken;
    }

    // Any update to this function should also be reflected in the respective JWT version
    async mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: any, userContext?: any): Promise<void> {
        const updatedPayload = { ...this.getAccessTokenPayload(userContext), ...accessTokenPayloadUpdate };
        for (const key of protectedProps) {
            delete updatedPayload[key];
        }

        for (const key of Object.keys(accessTokenPayloadUpdate)) {
            if (accessTokenPayloadUpdate[key] === null) {
                delete updatedPayload[key];
            }
        }

        await this.updateAccessTokenPayload(updatedPayload, userContext);
    }

    async getTimeCreated(userContext?: any): Promise<number> {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.timeCreated;
    }

    async getExpiry(userContext?: any): Promise<number> {
        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.expiry;
    }

    // Any update to this function should also be reflected in the respective JWT version
    async assertClaims(claimValidators: SessionClaimValidator[], userContext?: any): Promise<void> {
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
    }

    // Any update to this function should also be reflected in the respective JWT version
    async fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: any): Promise<void> {
        const update = await claim.build(this.getUserId(userContext), userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }

    // Any update to this function should also be reflected in the respective JWT version
    setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: any): Promise<void> {
        const update = claim.addToPayload_internal({}, value, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }

    // Any update to this function should also be reflected in the respective JWT version
    async getClaimValue<T>(claim: SessionClaim<T>, userContext?: any) {
        return claim.getValueFromPayload(await this.getAccessTokenPayload(userContext), userContext);
    }

    // Any update to this function should also be reflected in the respective JWT version
    removeClaim(claim: SessionClaim<any>, userContext?: any): Promise<void> {
        const update = claim.removeFromPayloadByMerge_internal({}, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    }

    /**
     * @deprecated Use mergeIntoAccessTokenPayload
     */
    async updateAccessTokenPayload(newAccessTokenPayload: any, userContext: any): Promise<void> {
        let response = await this.helpers.getRecipeImpl().regenerateAccessToken({
            accessToken: this.getAccessToken(),
            newAccessTokenPayload,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (response === undefined) {
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
                this.res,
                "access",
                response.accessToken.token,
                // We set the expiration to 100 years, because we can't really access the expiration of the refresh token everywhere we are setting it.
                // This should be safe to do, since this is only the validity of the cookie (set here or on the frontend) but we check the expiration of the JWT anyway.
                // Even if the token is expired the presence of the token indicates that the user could have a valid refresh
                // Setting them to infinity would require special case handling on the frontend and just adding 10 years seems enough.
                Date.now() + 3153600000000,
                this.transferMethod
            );
        }
    }
}
