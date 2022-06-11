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
const logger_1 = require("../../../logger");
const session_1 = require("../../session");
function getAPIInterface() {
    return {
        verifyEmailPOST: function ({ token, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                return yield options.recipeImplementation.verifyEmailUsingToken({ token, userContext });
            });
        },
        isEmailVerifiedGET: function ({ options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let session = yield session_1.default.getSession(options.req, options.res, userContext);
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                let userId = session.getUserId();
                let email = yield options.config.getEmailForUserId(userId, userContext);
                return {
                    status: "OK",
                    isVerified: yield options.recipeImplementation.isEmailVerified({ userId, email, userContext }),
                };
            });
        },
        generateEmailVerifyTokenPOST: function ({ options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let session = yield session_1.default.getSession(options.req, options.res, userContext);
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                let userId = session.getUserId();
                let email = yield options.config.getEmailForUserId(userId, userContext);
                let response = yield options.recipeImplementation.createEmailVerificationToken({
                    userId,
                    email,
                    userContext,
                });
                if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                    logger_1.logDebugMessage(
                        `Email verification email not sent to ${email} because it is already verified.`
                    );
                    return response;
                }
                let emailVerifyLink =
                    (yield options.config.getEmailVerificationURL({ id: userId, email }, userContext)) +
                    "?token=" +
                    response.token +
                    "&rid=" +
                    options.recipeId;
                logger_1.logDebugMessage(`Sending email verification email to ${email}`);
                yield options.emailDelivery.ingredientInterfaceImpl.sendEmail({
                    type: "EMAIL_VERIFICATION",
                    user: {
                        id: userId,
                        email: email,
                    },
                    emailVerifyLink,
                    userContext,
                });
                return {
                    status: "OK",
                };
            });
        },
    };
}
exports.default = getAPIInterface;
