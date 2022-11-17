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
const recipe_1 = require("../../../emailverification/recipe");
const utils_1 = require("../../../emailverification/utils");
exports.userEmailVerifyTokenPost = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const requestBody = yield options.req.getJSONBody();
        const userId = requestBody.userId;
        if (userId === undefined || typeof userId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'userId' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        let emailResponse = yield recipe_1.default.getInstanceOrThrowError().getEmailForUserId(userId, {});
        if (emailResponse.status !== "OK") {
            throw new Error("Should never come here");
        }
        let emailVerificationToken = yield emailverification_1.default.createEmailVerificationToken(userId);
        if (emailVerificationToken.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
            return {
                status: "EMAIL_ALREADY_VERIFIED_ERROR",
            };
        }
        let emailVerifyLink = utils_1.getEmailVerifyLink({
            appInfo: options.appInfo,
            token: emailVerificationToken.token,
            recipeId: recipe_1.default.RECIPE_ID,
        });
        yield emailverification_1.default.sendEmail({
            type: "EMAIL_VERIFICATION",
            user: {
                id: userId,
                email: emailResponse.email,
            },
            emailVerifyLink,
        });
        return {
            status: "OK",
        };
    });
