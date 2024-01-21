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
import { buildFrontToken, clearSession, setAntiCsrfTokenInHeaders, setToken } from "./cookieAndHeaders";
import STError from "./error";
import { SessionClaim, SessionClaimValidator, SessionContainerInterface, ReqResInfo, TokenInfo } from "./types";
import { Helpers } from "./recipeImplementation";
import { setAccessTokenInResponse } from "./utils";
import { parseJWTWithoutSignatureVerification } from "./jwt";
import { logDebugMessage } from "../../logger";
import RecipeUserId from "../../recipeUserId";
import { protectedProps } from "./constants";
import { getUserContext, makeDefaultUserContextFromAPI } from "../../utils";

export default class Session implements SessionContainerInterface {
    constructor(
        protected helpers: Helpers,
        protected accessToken: string,
        protected frontToken: string,
        protected refreshToken: TokenInfo | undefined,
        protected antiCsrfToken: string | undefined,
        protected sessionHandle: string,
        protected userId: string,
        protected recipeUserId: RecipeUserId,
        protected userDataInAccessToken: any,
        protected reqResInfo: ReqResInfo | undefined,
        protected accessTokenUpdated: boolean,
        protected tenantId: string
    ) {}

    getRecipeUserId(_userContext?: Record<string, any>): RecipeUserId {
        return this.recipeUserId;
    }

    async revokeSession(userContext?: Record<string, any>) {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        await this.helpers.getRecipeImpl().revokeSession({
            sessionHandle: this.sessionHandle,
            userContext: ctx,
        });

        if (this.reqResInfo !== undefined) {
            // we do not check the output of calling revokeSession
            // before clearing the cookies because we are revoking the
            // current API request's session.
            // If we instead clear the cookies only when revokeSession
            // returns true, it can cause this kind of a bug:
            // https://github.com/supertokens/supertokens-node/issues/343
            clearSession(
                this.helpers.config,
                this.reqResInfo.res,
                this.reqResInfo.transferMethod,
                this.reqResInfo.req,
                ctx
            );
        }
    }

    async getSessionDataFromDatabase(userContext?: Record<string, any>): Promise<any> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: ctx,
        });
        if (sessionInfo === undefined) {
            logDebugMessage("getSessionDataFromDatabase: Throwing UNAUTHORISED because session does not exist anymore");
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.sessionDataInDatabase;
    }

    async updateSessionDataInDatabase(newSessionData: any, userContext?: Record<string, any>) {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        if (
            !(await this.helpers.getRecipeImpl().updateSessionDataInDatabase({
                sessionHandle: this.sessionHandle,
                newSessionData,
                userContext: ctx,
            }))
        ) {
            logDebugMessage(
                "updateSessionDataInDatabase: Throwing UNAUTHORISED because session does not exist anymore"
            );
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
    }

    getUserId(_userContext?: Record<string, any>) {
        return this.userId;
    }

    getTenantId(_userContext?: Record<string, any>) {
        return this.tenantId;
    }

    getAccessTokenPayload(_userContext?: Record<string, any>) {
        return this.userDataInAccessToken;
    }

    getHandle() {
        return this.sessionHandle;
    }

    getAccessToken() {
        return this.accessToken;
    }

    getAllSessionTokensDangerously() {
        return {
            accessToken: this.accessToken,
            accessAndFrontTokenUpdated: this.accessTokenUpdated,
            refreshToken: this.refreshToken?.token,
            frontToken: this.frontToken,
            antiCsrfToken: this.antiCsrfToken,
        };
    }

    // Any update to this function should also be reflected in the respective JWT version
    async mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: any, userContext?: Record<string, any>): Promise<void> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        let newAccessTokenPayload = { ...this.getAccessTokenPayload(ctx) };
        for (const key of protectedProps) {
            delete newAccessTokenPayload[key];
        }

        newAccessTokenPayload = { ...newAccessTokenPayload, ...accessTokenPayloadUpdate };

        for (const key of Object.keys(accessTokenPayloadUpdate)) {
            if (accessTokenPayloadUpdate[key] === null) {
                delete newAccessTokenPayload[key];
            }
        }

        let response = await this.helpers.getRecipeImpl().regenerateAccessToken({
            accessToken: this.getAccessToken(),
            newAccessTokenPayload,
            userContext: ctx,
        });

        if (response === undefined) {
            logDebugMessage(
                "mergeIntoAccessTokenPayload: Throwing UNAUTHORISED because session does not exist anymore"
            );
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }

        if (response.accessToken !== undefined) {
            const respToken = parseJWTWithoutSignatureVerification(response.accessToken.token);
            const payload = respToken.version < 3 ? response.session.userDataInJWT : respToken.payload;
            this.userDataInAccessToken = payload;
            this.accessToken = response.accessToken.token;
            this.frontToken = buildFrontToken(this.userId, response.accessToken.expiry, payload);
            this.accessTokenUpdated = true;
            if (this.reqResInfo !== undefined) {
                // We need to cast to let TS know that the accessToken in the response is defined (and we don't overwrite it with undefined)
                setAccessTokenInResponse(
                    this.reqResInfo.res,
                    this.accessToken,
                    this.frontToken,
                    this.helpers.config,
                    this.reqResInfo.transferMethod,
                    this.reqResInfo.req,
                    ctx
                );
            }
        } else {
            // This case means that the access token has expired between the validation and this update
            // We can't update the access token on the FE, as it will need to call refresh anyway but we handle this as a successful update during this request.
            // the changes will be reflected on the FE after refresh is called
            this.userDataInAccessToken = {
                ...this.getAccessTokenPayload(ctx),
                ...response.session.userDataInJWT,
            };
        }
    }

    async getTimeCreated(userContext?: Record<string, any>): Promise<number> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: ctx,
        });
        if (sessionInfo === undefined) {
            logDebugMessage("getTimeCreated: Throwing UNAUTHORISED because session does not exist anymore");
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.timeCreated;
    }

    async getExpiry(userContext?: Record<string, any>): Promise<number> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        let sessionInfo = await this.helpers.getRecipeImpl().getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: ctx,
        });
        if (sessionInfo === undefined) {
            logDebugMessage("getExpiry: Throwing UNAUTHORISED because session does not exist anymore");
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.expiry;
    }

    // Any update to this function should also be reflected in the respective JWT version
    async assertClaims(claimValidators: SessionClaimValidator[], userContext?: Record<string, any>): Promise<void> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        let validateClaimResponse = await this.helpers.getRecipeImpl().validateClaims({
            accessTokenPayload: this.getAccessTokenPayload(ctx),
            userId: this.getUserId(ctx),
            recipeUserId: this.getRecipeUserId(ctx),
            claimValidators,
            userContext: ctx,
        });

        if (validateClaimResponse.accessTokenPayloadUpdate !== undefined) {
            for (const key of protectedProps) {
                delete validateClaimResponse.accessTokenPayloadUpdate[key];
            }

            await this.mergeIntoAccessTokenPayload(validateClaimResponse.accessTokenPayloadUpdate, ctx);
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
    async fetchAndSetClaim<T>(claim: SessionClaim<T>, userContext?: Record<string, any>): Promise<void> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        const update = await claim.build(
            this.getUserId(ctx),
            this.getRecipeUserId(ctx),
            this.getTenantId(ctx),
            this.getAccessTokenPayload(ctx),
            ctx
        );
        return this.mergeIntoAccessTokenPayload(update, ctx);
    }

    // Any update to this function should also be reflected in the respective JWT version
    setClaimValue<T>(claim: SessionClaim<T>, value: T, userContext?: Record<string, any>): Promise<void> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        const update = claim.addToPayload_internal({}, value, getUserContext(ctx));
        return this.mergeIntoAccessTokenPayload(update, ctx);
    }

    // Any update to this function should also be reflected in the respective JWT version
    async getClaimValue<T>(claim: SessionClaim<T>, userContext?: Record<string, any>) {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        return claim.getValueFromPayload(await this.getAccessTokenPayload(ctx), ctx);
    }

    // Any update to this function should also be reflected in the respective JWT version
    removeClaim(claim: SessionClaim<any>, userContext?: Record<string, any>): Promise<void> {
        const ctx =
            userContext === undefined && this.reqResInfo !== undefined
                ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                : getUserContext(userContext);

        const update = claim.removeFromPayloadByMerge_internal({}, ctx);
        return this.mergeIntoAccessTokenPayload(update, ctx);
    }

    attachToRequestResponse(info: ReqResInfo, userContext?: Record<string, any>) {
        this.reqResInfo = info;

        if (this.accessTokenUpdated) {
            const { res, transferMethod } = info;
            const ctx =
                userContext === undefined && this.reqResInfo !== undefined
                    ? makeDefaultUserContextFromAPI(this.reqResInfo.req)
                    : getUserContext(userContext);

            setAccessTokenInResponse(
                res,
                this.accessToken,
                this.frontToken,
                this.helpers.config,
                transferMethod,
                info.req,
                ctx
            );
            if (this.refreshToken !== undefined) {
                setToken(
                    this.helpers.config,
                    res,
                    "refresh",
                    this.refreshToken.token,
                    this.refreshToken.expiry,
                    transferMethod,
                    info.req,
                    ctx
                );
            }
            if (this.antiCsrfToken !== undefined) {
                setAntiCsrfTokenInHeaders(res, this.antiCsrfToken);
            }
        }
    }
}
