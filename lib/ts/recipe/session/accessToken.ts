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

import STError from "./error";
import { ParsedJWTInfo } from "./jwt";
import * as jose from "jose";
import { ProcessState, PROCESS_STATE } from "../../processState";

export async function getInfoFromAccessToken(
    jwtInfo: ParsedJWTInfo,
    jwks: jose.JWTVerifyGetKey,
    doAntiCsrfCheck: boolean
): Promise<{
    sessionHandle: string;
    userId: string;
    recipeUserId: string;
    refreshTokenHash1: string;
    parentRefreshTokenHash1: string | undefined;
    userData: any;
    antiCsrfToken: string | undefined;
    expiryTime: number;
    timeCreated: number;
}> {
    try {
        // From the library examples
        let payload = undefined;
        try {
            payload = (await jose.jwtVerify(jwtInfo.rawTokenString, jwks)).payload;
        } catch (error) {
            // We only want to opt-into this for V2 access tokens
            if (jwtInfo.version === 2 && error?.code === "ERR_JWKS_MULTIPLE_MATCHING_KEYS") {
                ProcessState.getInstance().addState(PROCESS_STATE.MULTI_JWKS_VALIDATION);
                // We are trying to validate the token with each key.
                // Since the kid is missing from v2 tokens, this basically means we try all keys present in the cache.
                for await (const publicKey of error) {
                    try {
                        payload = (await jose.jwtVerify(jwtInfo.rawTokenString, publicKey)).payload;
                        break;
                    } catch (innerError) {
                        if (innerError?.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
                            continue;
                        }
                        throw innerError;
                    }
                }
                if (payload === undefined) {
                    throw new jose.errors.JWSSignatureVerificationFailed();
                }
            } else {
                throw error;
            }
        }

        // This should be called before this function, but the check is very quick, so we can also do them here
        validateAccessTokenStructure(payload, jwtInfo.version);

        // We can mark these as defined (the ! after the calls), since validateAccessTokenPayload checks this
        let userId = jwtInfo.version === 2 ? sanitizeStringInput(payload.userId)! : sanitizeStringInput(payload.sub)!;
        let expiryTime =
            jwtInfo.version === 2 ? sanitizeNumberInput(payload.expiryTime)! : sanitizeNumberInput(payload.exp)! * 1000;
        let timeCreated =
            jwtInfo.version === 2
                ? sanitizeNumberInput(payload.timeCreated)!
                : sanitizeNumberInput(payload.iat)! * 1000;
        let userData = jwtInfo.version === 2 ? payload.userData : payload;
        let sessionHandle = sanitizeStringInput(payload.sessionHandle)!;
        let recipeUserId = sanitizeStringInput(payload.recipeUserId)!;
        let refreshTokenHash1 = sanitizeStringInput(payload.refreshTokenHash1)!;
        let parentRefreshTokenHash1 = sanitizeStringInput(payload.parentRefreshTokenHash1);
        let antiCsrfToken = sanitizeStringInput(payload.antiCsrfToken);

        if (antiCsrfToken === undefined && doAntiCsrfCheck) {
            throw Error("Access token does not contain the anti-csrf token.");
        }

        if (expiryTime < Date.now()) {
            throw Error("Access token expired");
        }
        return {
            sessionHandle,
            userId,
            refreshTokenHash1,
            parentRefreshTokenHash1,
            userData,
            antiCsrfToken,
            expiryTime,
            timeCreated,
            recipeUserId,
        };
    } catch (err) {
        throw new STError({
            message: "Failed to verify access token",
            type: STError.TRY_REFRESH_TOKEN,
        });
    }
}

export function validateAccessTokenStructure(payload: any, version: number) {
    if (version >= 3) {
        if (
            typeof payload.sub !== "string" ||
            typeof payload.exp !== "number" ||
            typeof payload.iat !== "number" ||
            typeof payload.sessionHandle !== "string" ||
            typeof payload.refreshTokenHash1 !== "string"
        ) {
            // it would come here if we change the structure of the JWT.
            throw Error("Access token does not contain all the information. Maybe the structure has changed?");
        }
    } else if (
        typeof payload.sessionHandle !== "string" ||
        typeof payload.userId !== "string" ||
        typeof payload.recipeUserId !== "string" ||
        typeof payload.refreshTokenHash1 !== "string" ||
        payload.userData === undefined ||
        typeof payload.expiryTime !== "number" ||
        typeof payload.timeCreated !== "number"
    ) {
        // it would come here if we change the structure of the JWT.
        throw Error("Access token does not contain all the information. Maybe the structure has changed?");
    }
}

function sanitizeStringInput(field: any): string | undefined {
    if (field === "") {
        return "";
    }
    if (typeof field !== "string") {
        return undefined;
    }
    try {
        let result = field.trim();
        return result;
    } catch (err) {}
    return undefined;
}

export function sanitizeNumberInput(field: any): number | undefined {
    if (typeof field === "number") {
        return field;
    }
    return undefined;
}
