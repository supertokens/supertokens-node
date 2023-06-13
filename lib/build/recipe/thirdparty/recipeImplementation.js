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
                let response;
                if (process.env.MOCK !== "true") {
                    response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup"), {
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
                    response = yield mockCore_1.mockCreateNewOrUpdateEmailOfRecipeUser(
                        thirdPartyId,
                        thirdPartyUserId,
                        email,
                        querier
                    );
                }
                if (response.status === "OK") {
                    let recipeUserId = undefined;
                    for (let i = 0; i < response.user.loginMethods.length; i++) {
                        if (
                            response.user.loginMethods[i].recipeId === "thirdparty" &&
                            response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                                id: thirdPartyId,
                                userId: thirdPartyUserId,
                            })
                        ) {
                            recipeUserId = response.user.loginMethods[i].recipeUserId;
                            break;
                        }
                    }
                    yield recipe_1.default.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                        recipeUserId: recipeUserId,
                        userContext,
                    });
                    // The above may have marked the user's email as verified already, but in case
                    // this is a sign up, or it's a sign in from a non primary user, and the
                    // provider said that the user's email is verified, we should mark it as verified
                    // here as well
                    if (isVerified) {
                        let verifyResponse = yield emailverification_1.default.createEmailVerificationToken(
                            recipeUserId,
                            undefined,
                            userContext
                        );
                        if (verifyResponse.status === "OK") {
                            // we pass in false here cause we do not want to attempt account linking
                            // as of yet.
                            yield emailverification_1.default.verifyEmailUsingToken(
                                verifyResponse.token,
                                false,
                                userContext
                            );
                        }
                    }
                    // we do this so that we get the updated user (in case the above
                    // function updated the verification status) and can return that
                    response.user = yield __1.getUser(recipeUserId.getAsString(), userContext);
                }
                return response;
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
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up because new email cannot be applied to existing account. Please contact support",
                    };
                }
                if (!response.createdNewUser) {
                    // Unlike in the sign up scenario, we do not do account linking here
                    // cause we do not want sign in to change the potentially user ID of a user
                    // due to linking when this function is called by the dev in their API.
                    // If we did account linking
                    // then we would have to ask the dev to also change the session
                    // in such API calls.
                    // In the case of sign up, since we are creating a new user, it's fine
                    // to link there since there is no user id change really from the dev's
                    // point of view who is calling the sign up recipe function.
                    return response;
                }
                let userId = response.user.id;
                // We do this here and not in createNewOrUpdateEmailOfRecipeUser cause
                // createNewOrUpdateEmailOfRecipeUser is also called in post login account linking.
                let recipeUserId = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].recipeId === "thirdparty" &&
                        response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                            id: thirdPartyId,
                            userId: thirdPartyUserId,
                        })
                    ) {
                        recipeUserId = response.user.loginMethods[i].recipeUserId;
                        break;
                    }
                }
                userId = yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                    recipeUserId: recipeUserId,
                    checkAccountsToLinkTableAsWell: true,
                    userContext,
                });
                let updatedUser = yield __1.getUser(userId, userContext);
                if (updatedUser === undefined) {
                    throw new Error("Should never come here.");
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
