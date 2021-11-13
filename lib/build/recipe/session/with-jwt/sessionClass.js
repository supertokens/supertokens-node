"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
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
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const sessionClass_1 = require("../sessionClass");
const SessionFunctions = require("../sessionFunctions");
class SessionClassWithJWT extends sessionClass_1.default {
    constructor(helpers, accessToken, sessionHandle, userId, userDataInAccessToken, res, jwtRecipeImplementation) {
        super(helpers, accessToken, sessionHandle, userId, userDataInAccessToken, res);
        this.updateAccessTokenPayload = (newAccessTokenPayload) =>
            __awaiter(this, void 0, void 0, function* () {
                let sessionInformation = yield SessionFunctions.getSessionInformation(this.helpers, this.sessionHandle);
                let existingJWT = sessionInformation.accessTokenPayload.jwt;
                if (existingJWT === undefined) {
                    return super.updateAccessTokenPayload(newAccessTokenPayload);
                }
                let currentTimeInSeconds = Date.now() / 1000;
                let existingJWTValidity =
                    JSON.parse(Buffer.from(existingJWT.split(".")[1], "base64").toString("utf-8")).exp -
                    currentTimeInSeconds;
                let newJWTResponse = yield this.jwtRecipeImplementation.createJWT({
                    payload: newAccessTokenPayload,
                    validitySeconds: existingJWTValidity,
                });
                if (newJWTResponse.status === "UNSUPPORTED_ALGORITHM_ERROR") {
                    // Should never come here
                    throw new Error("JWT Signing algorithm not supported");
                }
                newAccessTokenPayload = Object.assign(Object.assign({}, newAccessTokenPayload), {
                    jwt: newJWTResponse.jwt,
                });
                return yield super.updateAccessTokenPayload({
                    newAccessTokenPayload,
                });
            });
        this.jwtRecipeImplementation = jwtRecipeImplementation;
    }
}
exports.default = SessionClassWithJWT;
