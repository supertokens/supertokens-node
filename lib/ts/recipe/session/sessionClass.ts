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
import { attachAccessTokenToCookie, clearSessionFromCookie, setFrontTokenInHeaders } from "./cookieAndHeaders";
import STError from "./error";
import { SessionClaim, SessionClaimValidator, SessionContainerInterface } from "./types";
import { Helpers } from "./recipeImplementation";
import { logDebugMessage } from "../../logger";

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

    revokeSession = async (userContext?: any) => {
        await this.helpers.sessionRecipeImpl.revokeSession({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });

        // we do not check the output of calling revokeSession
        // before clearing the cookies because we are revoking the
        // current API request's session.
        // If we instead clear the cookies only when revokeSession
        // returns true, it can cause this kind of a bug:
        // https://github.com/supertokens/supertokens-node/issues/343
        clearSessionFromCookie(this.helpers.config, this.res);
    };

    getSessionData = async (userContext?: any): Promise<any> => {
        let sessionInfo = await this.helpers.sessionRecipeImpl.getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            clearSessionFromCookie(this.helpers.config, this.res);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.sessionData;
    };

    updateSessionData = async (newSessionData: any, userContext?: any) => {
        if (
            !(await this.helpers.sessionRecipeImpl.updateSessionData({
                sessionHandle: this.sessionHandle,
                newSessionData,
                userContext: userContext === undefined ? {} : userContext,
            }))
        ) {
            clearSessionFromCookie(this.helpers.config, this.res);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
    };

    getUserId = () => {
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
        let sessionInfo = await this.helpers.sessionRecipeImpl.getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            clearSessionFromCookie(this.helpers.config, this.res);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.timeCreated;
    };

    getExpiry = async (userContext?: any): Promise<number> => {
        let sessionInfo = await this.helpers.sessionRecipeImpl.getSessionInformation({
            sessionHandle: this.sessionHandle,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (sessionInfo === undefined) {
            clearSessionFromCookie(this.helpers.config, this.res);
            throw new STError({
                message: "Session does not exist anymore",
                type: STError.UNAUTHORISED,
            });
        }
        return sessionInfo.expiry;
    };

    assertClaims = async (claimValidators: SessionClaimValidator[], userContext?: any): Promise<void> => {
        const origSessionClaimPayloadJSON = JSON.stringify(this.getAccessTokenPayload());

        let newAccessTokenPayload = this.getAccessTokenPayload();
        let validationErrors = [];
        for (const validator of claimValidators) {
            logDebugMessage("Session.validateClaims checking " + validator.id);
            if ("claim" in validator && (await validator.shouldRefetch(newAccessTokenPayload, userContext))) {
                logDebugMessage("Session.validateClaims refetching " + validator.id);
                const value = await validator.claim.fetchValue(this.getUserId(), userContext);
                logDebugMessage("Session.validateClaims " + validator.id + " refetch res " + JSON.stringify(value));
                if (value !== undefined) {
                    newAccessTokenPayload = validator.claim.addToPayload_internal(
                        newAccessTokenPayload,
                        value,
                        userContext
                    );
                }
            }
            const claimValidationResult = await validator.validate(newAccessTokenPayload, userContext);
            logDebugMessage(
                "Session.validateClaims " + validator.id + " validation res " + JSON.stringify(claimValidationResult)
            );
            if (!claimValidationResult.isValid) {
                validationErrors.push({
                    id: validator.id,
                    reason: claimValidationResult.reason,
                });
            }
        }

        if (JSON.stringify(newAccessTokenPayload) !== origSessionClaimPayloadJSON) {
            await this.mergeIntoAccessTokenPayload(newAccessTokenPayload, userContext);
        }
        if (validationErrors.length !== 0) {
            throw new STError({
                type: "INVALID_CLAIMS",
                message: "INVALID_CLAIMS",
                payload: validationErrors,
            });
        }
    };

    fetchAndSetClaim = async <T>(claim: SessionClaim<T>, userContext?: any) => {
        const update = await claim.build(this.getUserId(), userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    };

    setClaimValue = <T>(claim: SessionClaim<T>, value: T, userContext?: any) => {
        const update = claim.addToPayload_internal({}, value, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    };

    getClaimValue = async <T>(claim: SessionClaim<T>, userContext?: any) => {
        return claim.getValueFromPayload(await this.getAccessTokenPayload(), userContext);
    };

    removeClaim = (claim: SessionClaim<any>, userContext?: any) => {
        const update = claim.removeFromPayloadByMerge_internal({}, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    };

    /**
     * @deprecated Use mergeIntoAccessTokenPayload
     */
    updateAccessTokenPayload = async (newAccessTokenPayload: any | undefined, userContext: any) => {
        let response = await this.helpers.sessionRecipeImpl.regenerateAccessToken({
            accessToken: this.getAccessToken(),
            newAccessTokenPayload,
            userContext: userContext === undefined ? {} : userContext,
        });
        if (response === undefined) {
            clearSessionFromCookie(this.helpers.config, this.res);
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
            attachAccessTokenToCookie(
                this.helpers.config,
                this.res,
                response.accessToken.token,
                response.accessToken.expiry
            );
        }
    };
}
