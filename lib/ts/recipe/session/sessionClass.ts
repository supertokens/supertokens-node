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
        if (
            await this.helpers.sessionRecipeImpl.revokeSession({
                sessionHandle: this.sessionHandle,
                userContext: userContext === undefined ? {} : userContext,
            })
        ) {
            clearSessionFromCookie(this.helpers.config, this.res);
        }
    };

    getSessionData = async (userContext?: any): Promise<any> => {
        try {
            return (
                await this.helpers.sessionRecipeImpl.getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                })
            ).sessionData;
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
    };

    updateSessionData = async (newSessionData: any, userContext?: any) => {
        try {
            await this.helpers.sessionRecipeImpl.updateSessionData({
                sessionHandle: this.sessionHandle,
                newSessionData,
                userContext: userContext === undefined ? {} : userContext,
            });
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
        try {
            return (
                await this.helpers.sessionRecipeImpl.getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                })
            ).timeCreated;
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
    };

    getExpiry = async (userContext?: any): Promise<number> => {
        try {
            return (
                await this.helpers.sessionRecipeImpl.getSessionInformation({
                    sessionHandle: this.sessionHandle,
                    userContext: userContext === undefined ? {} : userContext,
                })
            ).expiry;
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
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
                type: "INVALID_CLAIM",
                message: "INVALID_CLAIM",
                payload: validationErrors,
            });
        }
    };

    fetchAndGetAccessTokenPayloadUpdate = async <T>(claim: SessionClaim<T>, userContext?: any) => {
        const update = await claim.fetchAndGetAccessTokenPayloadUpdate(this.getUserId(), userContext);
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
        const update = claim.removeFromPayload({}, userContext);
        return this.mergeIntoAccessTokenPayload(update, userContext);
    };

    /**
     * @deprecated Use mergeIntoAccessTokenPayload
     */
    updateAccessTokenPayload = async (newAccessTokenPayload: any | undefined, userContext: any) => {
        try {
            let response = await this.helpers.sessionRecipeImpl.regenerateAccessToken({
                accessToken: this.getAccessToken(),
                newAccessTokenPayload,
                userContext: userContext === undefined ? {} : userContext,
            });
            // We update both, because the ones in the response are the latest for both
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
        } catch (err) {
            if (err.type === STError.UNAUTHORISED) {
                clearSessionFromCookie(this.helpers.config, this.res);
            }
            throw err;
        }
    };
}
