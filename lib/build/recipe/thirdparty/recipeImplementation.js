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
const mockCore_1 = require("./mockCore");
const emailverification_1 = __importDefault(require("../emailverification"));
function getRecipeImplementation(querier) {
    return {
        createNewOrUpdateEmailOfRecipeUser: function ({
            thirdPartyId,
            thirdPartyUserId,
            email,
            isVerified,
            userContext,
        }) {
            return __awaiter(this, void 0, void 0, function* () {
                // TODO: call isEmailChangeAllowed
                let users = yield recipe_1.default.getInstance().recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo: {
                        thirdParty: {
                            id: thirdPartyId,
                            userId: thirdPartyUserId,
                        },
                    },
                    doUnionOfAccountInfo: false,
                    userContext,
                });
                // we can do this check cause we are checking based on third party info which is always
                // unique.
                if (users.length > 1) {
                    throw new Error(
                        "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                    );
                }
                if (users.length === 1 && !isVerified) {
                    // Even if the input isVerified is false, it's from the provider.
                    // Since this is a sign in, the user may have previously verified
                    // their email already with SuperTokens, and so we should set
                    // isVerified to true before proceeding.
                    let recipeUserId = undefined;
                    users[0].loginMethods.forEach((lM) => {
                        if (
                            lM.hasSameThirdPartyInfoAs({
                                id: thirdPartyId,
                                userId: thirdPartyUserId,
                            })
                        ) {
                            recipeUserId = lM.recipeUserId;
                        }
                    });
                    isVerified = yield emailverification_1.default.isEmailVerified(recipeUserId, email);
                }
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
                        isVerified,
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
                    isVerified,
                    userContext,
                });
                if (response.status === "EMAIL_CHANGE_NOT_ALLOWED_ERROR") {
                    return {
                        status: "SIGN_IN_NOT_ALLOWED",
                        reason: response.reason,
                    };
                }
                let userId = response.user.id;
                if (response.createdNewUser) {
                    // We do this here and not in createNewOrUpdateEmailOfRecipeUser cause
                    // createNewOrUpdateEmailOfRecipeUser is also called in post login account linking.
                    userId = yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                        // we can use index 0 cause this is a new recipe user
                        recipeUserId: response.user.loginMethods[0].recipeUserId,
                        checkAccountsToLinkTableAsWell: true,
                        userContext,
                    });
                }
                let updatedUser = yield __1.getUser(userId, userContext);
                if (updatedUser === undefined) {
                    throw new Error("Should never come here.");
                }
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: updatedUser,
                };
            });
        },
    };
}
exports.default = getRecipeImplementation;
