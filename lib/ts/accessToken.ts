import * as validator from "validator";

import { AuthError, generateError } from "./error";
import { verifyJWTAndGetPayload } from "./jwt";

export async function getInfoFromAccessToken(
    token: string,
    jwtSigningPublicKey: string,
    doAntiCsrfCheck: boolean
): Promise<{
    sessionHandle: string;
    userId: string | number;
    refreshTokenHash1: string;
    parentRefreshTokenHash1: string | undefined;
    userData: any;
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
        let antiCsrfToken = sanitizeStringInput(payload.antiCsrfToken);
        let expiryTime = sanitizeNumberInput(payload.expiryTime);
        let timeCreated = sanitizeNumberInput(payload.timeCreated);
        if (
            sessionHandle === undefined ||
            userId === undefined ||
            refreshTokenHash1 === undefined ||
            userData === undefined ||
            (antiCsrfToken === undefined && doAntiCsrfCheck) ||
            expiryTime === undefined ||
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
            antiCsrfToken,
            expiryTime,
            timeCreated
        };
    } catch (err) {
        throw generateError(AuthError.TRY_REFRESH_TOKEN, err);
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
        let result = validator.trim(field);
        return result;
    } catch (err) {}
    return undefined;
}

function sanitizeNumberInput(field: any): number | undefined {
    if (typeof field === "number") {
        return field;
    }
    return undefined;
}
