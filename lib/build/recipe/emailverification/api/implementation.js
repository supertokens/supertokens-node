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
const __1 = require("../");
const session_1 = require("../../session");
class APIImplementation {
    constructor(recipeInstance) {
        this.verifyEmailPOST = (token, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let user = yield options.recipeImplementation.verifyEmailUsingToken(token);
                this.recipeInstance.config.handlePostEmailVerification(user).catch((_) => {});
                return {
                    status: "OK",
                };
            });
        this.isEmailVerifiedGET = (options) =>
            __awaiter(this, void 0, void 0, function* () {
                let session = yield session_1.default.getSession(options.req, options.res);
                if (session === undefined) {
                    throw new __1.Error(
                        {
                            type: __1.Error.GENERAL_ERROR,
                            payload: new Error("Session is undefined. Should not come here."),
                        },
                        this.recipeInstance
                    );
                }
                let userId = session.getUserId();
                let email = yield this.recipeInstance.config.getEmailForUserId(userId);
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
                    throw new __1.Error(
                        {
                            type: __1.Error.GENERAL_ERROR,
                            payload: new Error("Session is undefined. Should not come here."),
                        },
                        this.recipeInstance
                    );
                }
                let userId = session.getUserId();
                let email = yield this.recipeInstance.config.getEmailForUserId(userId);
                let token = yield options.recipeImplementation.createEmailVerificationToken(userId, email);
                let emailVerifyLink =
                    (yield this.recipeInstance.config.getEmailVerificationURL({ id: userId, email })) +
                    "?token=" +
                    token +
                    "&rid=" +
                    this.recipeInstance.getRecipeId();
                this.recipeInstance.config
                    .createAndSendCustomEmail({ id: userId, email }, emailVerifyLink)
                    .catch((_) => {});
                return {
                    status: "OK",
                };
            });
        this.recipeInstance = recipeInstance;
    }
}
exports.default = APIImplementation;
//# sourceMappingURL=implementation.js.map
