"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const validator = require("validator");
const error_1 = require("./error");
const jwt_1 = require("./jwt");
function getInfoFromAccessToken(token, jwtSigningPublicKey, doAntiCsrfCheck) {
    return __awaiter(this, void 0, void 0, function*() {
        try {
            let payload = jwt_1.verifyJWTAndGetPayload(
                token,
                "-----BEGIN PUBLIC KEY-----\n" + jwtSigningPublicKey + "\n-----END PUBLIC KEY-----"
            );
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
            throw error_1.generateError(error_1.AuthError.TRY_REFRESH_TOKEN, err);
        }
    });
}
exports.getInfoFromAccessToken = getInfoFromAccessToken;
function sanitizeStringInput(field) {
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
function sanitizeNumberInput(field) {
    if (typeof field === "number") {
        return field;
    }
    return undefined;
}
//# sourceMappingURL=accessToken.js.map
