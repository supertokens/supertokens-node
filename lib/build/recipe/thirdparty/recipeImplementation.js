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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const __1 = require("../..");
const recipe_2 = __importDefault(require("../emailverification/recipe"));
const mockCore_1 = require("./mockCore");
function getRecipeImplementation(querier) {
    return {
        createNewOrUpdateEmailOfRecipeUser: function ({ thirdPartyId, thirdPartyUserId, email }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (process.env.MOCK !== "true") {
                    let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup"), {
                        thirdPartyId,
                        thirdPartyUserId,
                        email: { id: email },
                    });
                    return {
                        status: "OK",
                        createdNewUser: response.createdNewUser,
                        user: response.user,
                    };
                } else {
                    return mockCore_1.mockCreateNewOrUpdateEmailOfRecipeUser(
                        thirdPartyId,
                        thirdPartyUserId,
                        email,
                        querier
                    );
                }
            });
        },
        signInUp: function ({ thirdPartyId, thirdPartyUserId, email, isVerified, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield this.createNewOrUpdateEmailOfRecipeUser({
                    thirdPartyId,
                    thirdPartyUserId,
                    email,
                    userContext,
                });
                if (response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
                    return {
                        status: "SIGN_IN_NOT_ALLOWED",
                        reason: response.reason,
                    };
                }
                if (response.createdNewUser) {
                    if (isVerified) {
                        const emailVerificationInstance = recipe_2.default.getInstance();
                        if (emailVerificationInstance) {
                            const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                                {
                                    recipeUserId: response.user.loginMethods[0].recipeUserId,
                                    email,
                                    userContext,
                                }
                            );
                            if (tokenResponse.status === "OK") {
                                yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                    token: tokenResponse.token,
                                    attemptAccountLinking: false,
                                    userContext,
                                });
                            }
                        }
                    }
                    let userId = yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                        // we can use index 0 cause this is a new recipe user
                        recipeUserId: response.user.loginMethods[0].recipeUserId,
                        checkAccountsToLinkTableAsWell: true,
                        userContext,
                    });
                    let updatedUser = yield __1.getUser(userId, userContext);
                    if (updatedUser === undefined) {
                        throw new Error("Should never come here.");
                    }
                }
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                };
            });
        },
    };
}
exports.default = getRecipeImplementation;
