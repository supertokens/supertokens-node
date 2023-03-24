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
import { clearSession } from "./cookieAndHeaders";
import STError from "./error";
import { SessionClaim, SessionClaimValidator, SessionContainerInterface, TokenTransferMethod } from "./types";
import { Helpers, protectedProps } from "./recipeImplementation";
import { setAccessTokenInResponse } from "./utils";
import { parseJWTWithoutSignatureVerification } from "./jwt";

type ReqResInfo = {
    res: BaseResponse;
    req: BaseRequest;
    transferMethod: TokenTransferMethod;
};

export default class Session implements SessionContainerInterface {
    constructor(
        protected helpers: Helpers,
        protected accessToken: string,
        protected frontToken: string,
        protected refreshToken: string | undefined,
        protected antiCsrfToken: string | undefined,
        protected sessionHandle: string,
        protected userId: string,
        protected userDataInAccessToken: any,
        protected reqResInfo: ReqResInfo | undefined,
        protected accessTokenUpdated: boolean
    ) {}

    async revokeSession(userContext?: any) {
        await this.helpers.getRecipeImpl().revokeSession({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });

        // These can  only ever be
        if (this.reqResInfo !== undefined) {
            // we do not check the output of calling revokeSession
            // before clearing the cookies because we are revoking the
            // current API request's session.
            // If we instead clear the cookies only when revokeSession
            // returns true, it can cause this kind of a bug:
            // https://github.com/supertokens/supertokens-node/issues/343
            clearSession(this.helpers.config, this.reqResInfo.res, this.reqResInfo.transferMethod);
        }
    }

    async getSessionDataFromDatabase(userContext?: any): Promise<any> {
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
        return sessionInfo.sessionDataInDatabase;
    }

    async updateSessionDataInDatabase(newSessionData: any, userContext?: any) {
        if (
            !(await this.helpers.getRecipeImpl().updateSessionDataInDatabase({
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

    getTokensDangerously() {
        return {
            accessToken: this.accessToken,
            accessAndFrontTokenUpdated: this.accessTokenUpdated,
            refreshToken: this.refreshToken,
            frontToken: this.frontToken,
            antiCsrf: this.antiCsrfToken,
        };
    }

    // Any update to this function should also be reflected in the respective JWT version
    async mergeIntoAccessTokenPayload(accessTokenPayloadUpdate: any, userContext?: any): Promise<void> {
        let newAccessTokenPayload = { ...this.getAccessTokenPayload(userContext) };
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
            userContext: userContext === undefined ? {} : userContext,
        });

        if (response === undefined) {
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }

        if (response.accessToken !== undefined) {
            const payload = parseJWTWithoutSignatureVerification(response.accessToken.token).payload;
            this.userDataInAccessToken = payload;
            this.accessToken = response.accessToken.token;
            this.accessTokenUpdated = true;
            if (this.reqResInfo !== undefined) {
                // We need to cast to let TS know that the accessToken in the response is defined (and we don't overwrite it with undefined)
                setAccessTokenInResponse(
                    this.reqResInfo.res,
                    response as Required<typeof response>,
                    this.helpers.config,
                    this.reqResInfo.transferMethod
                );
            }
        } else {
            // This case means that the access token has expired between the validation and this update
            // We can't update the access token on the FE, as it will need to call refresh anyway but we handle this as a successful update during this request.
            // the changes will be reflected on the FE after refresh is called
            this.userDataInAccessToken = {
                ...this.getAccessTokenPayload(),
                ...response.session.userDataInJWT,
            };
        }
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
            for (const key of protectedProps) {
                delete validateClaimResponse.accessTokenPayloadUpdate[key];
            }

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
}
