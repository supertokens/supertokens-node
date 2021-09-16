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
const session_1 = require("../../session");
class APIImplementation {
    constructor() {
        this.verifyEmailPOST = ({ token, options }) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield options.recipeImplementation.verifyEmailUsingToken({ token });
            });
        this.isEmailVerifiedGET = ({ options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let session = yield session_1.default.getSession(options.req, options.res);
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                let userId = session.getUserId();
                let email = yield options.config.getEmailForUserId(userId);
                return {
                    status: "OK",
                    isVerified: yield options.recipeImplementation.isEmailVerified({ userId, email }),
                };
            });
        this.generateEmailVerifyTokenPOST = ({ options }) =>
            __awaiter(this, void 0, void 0, function* () {
                let session = yield session_1.default.getSession(options.req, options.res);
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                let userId = session.getUserId();
                let email = yield options.config.getEmailForUserId(userId);
                let response = yield options.recipeImplementation.createEmailVerificationToken({ userId, email });
                if (response.status === "EMAIL_ALREADY_VERIFIED_ERROR") {
                    return response;
                }
                let emailVerifyLink =
                    (yield options.config.getEmailVerificationURL({ id: userId, email })) +
                    "?token=" +
                    response.token +
                    "&rid=" +
                    options.recipeId;
                try {
                    if (!options.isInServerlessEnv) {
                        options.config
                            .createAndSendCustomEmail({ id: userId, email }, emailVerifyLink)
                            .catch((_) => {});
                    } else {
                        // see https://github.com/supertokens/supertokens-node/pull/135
                        yield options.config.createAndSendCustomEmail({ id: userId, email }, emailVerifyLink);
                    }
                } catch (_) {}
                return {
                    status: "OK",
                };
            });
    }
}
exports.default = APIImplementation;
