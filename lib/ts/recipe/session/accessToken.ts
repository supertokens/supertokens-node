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
import { verifyJWTAndGetPayload } from "./jwt";

export async function getInfoFromAccessToken(
    token: string,
    jwtSigningPublicKey: string,
    doAntiCsrfCheck: boolean
): Promise<{
    sessionHandle: string;
    userId: string;
    refreshTokenHash1: string;
    parentRefreshTokenHash1: string | undefined;
    userData: any;
    grants: any;
    antiCsrfToken: string | undefined;
    expiryTime: number;
    timeCreated: number;
}> {
    try {
        let payload = verifyJWTAndGetPayload(token, jwtSigningPublicKey);

        let sessionHandle = sanitizeStringInput(payload.sessionHandle);
        let userId = sanitizeStringInput(payload.userId);
        let refreshTokenHash1 = sanitizeStringInput(payload.refreshTokenHash1);
        let parentRefreshTokenHash1 = sanitizeStringInput(payload.parentRefreshTokenHash1);
        let userData = payload.userData;
        let grants = payload.grants;
        let antiCsrfToken = sanitizeStringInput(payload.antiCsrfToken);
        let expiryTime = sanitizeNumberInput(payload.expiryTime);
        let timeCreated = sanitizeNumberInput(payload.timeCreated);
        if (
            sessionHandle === undefined ||
            userId === undefined ||
            refreshTokenHash1 === undefined ||
            userData === undefined ||
            (antiCsrfToken === undefined && doAntiCsrfCheck) ||
            expiryTime === undefined || // TODO: maybe add grants here depending on the CDI version?
            timeCreated === undefined
        ) {
            // it would come here if we change the structure of the JWT.
            throw Error("Access token does not contain all the information. Maybe the structure has changed?");
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
            grants,
            antiCsrfToken,
            expiryTime,
            timeCreated,
        };
    } catch (err) {
        throw new STError({
            message: "Failed to verify access token",
            type: STError.TRY_REFRESH_TOKEN,
        });
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
