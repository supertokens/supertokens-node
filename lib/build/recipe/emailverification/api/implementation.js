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
const error_1 = require("../error");
class APIImplementation {
    constructor() {
        this.verifyEmailPOST = (token, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield options.recipeImplementation.verifyEmailUsingToken(token);
                return {
                    status: "OK",
                    user,
                };
            });
        this.isEmailVerifiedGET = (options) =>
            __awaiter(this, void 0, void 0, function* () {
                let session = yield session_1.default.getSession(options.req, options.res);
                if (session === undefined) {
                    throw new error_1.default({
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error("Session is undefined. Should not come here."),
                    });
                }
                let userId = session.getUserId();
                let email = yield options.config.getEmailForUserId(userId);
                let isVerified = yield options.recipeImplementation.isEmailVerified(userId, email);
                return {
                    status: "OK",
                    isVerified,
                };
            });
        this.generateEmailVerifyTokenPOST = (options) =>
            __awaiter(this, void 0, void 0, function* () {
                let session = yield session_1.default.getSession(options.req, options.res);
                if (session === undefined) {
                    throw new error_1.default({
                        type: error_1.default.GENERAL_ERROR,
                        payload: new Error("Session is undefined. Should not come here."),
                    });
                }
                let userId = session.getUserId();
                let email = yield options.config.getEmailForUserId(userId);
                let token = yield options.recipeImplementation.createEmailVerificationToken(userId, email);
                let emailVerifyLink =
                    (yield options.config.getEmailVerificationURL({ id: userId, email })) +
                    "?token=" +
                    token +
                    "&rid=" +
                    options.recipeId;
                try {
                    options.config.createAndSendCustomEmail({ id: userId, email }, emailVerifyLink).catch((_) => {});
                } catch (ignored) {}
                return {
                    status: "OK",
                };
            });
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=implementation.js.map
