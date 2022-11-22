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
const error_1 = require("../../../../error");
const emailverification_1 = require("../../../emailverification");
exports.userEmailVerifyPut = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const requestBody = yield options.req.getJSONBody();
        const userId = requestBody.userId;
        const verified = requestBody.verified;
        if (userId === undefined || typeof userId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'userId' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (verified === undefined || typeof verified !== "boolean") {
            throw new error_1.default({
                message: "Required parameter 'verified' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (verified) {
            const tokenResponse = yield emailverification_1.default.createEmailVerificationToken(userId);
            if (tokenResponse.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                return {
                    status: "OK",
                };
            }
            const verifyResponse = yield emailverification_1.default.verifyEmailUsingToken(tokenResponse.token);
            if (verifyResponse.status === "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR") {
                // This should never happen because we consume the token immediately after creating it
                throw new Error("Should not come here");
            }
        } else {
            yield emailverification_1.default.unverifyEmail(userId);
        }
        return {
            status: "OK",
        };
    });
