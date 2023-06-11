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
exports.mockCreateNewOrUpdateEmailOfRecipeUser = void 0;
const mockCore_1 = require("../accountlinking/mockCore");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const assert_1 = __importDefault(require("assert"));
function mockCreateNewOrUpdateEmailOfRecipeUser(
    thirdPartyId,
    thirdPartyUserId,
    email,
    isAccountLinkingEnabled,
    isVerified,
    querier
) {
    return __awaiter(this, void 0, void 0, function* () {
        let shouldMarkInputEmailVerified = false;
        let thirdPartyUser = yield mockCore_1.mockListUsersByAccountInfo({
            accountInfo: {
                thirdParty: {
                    id: thirdPartyId,
                    userId: thirdPartyUserId,
                },
            },
            doUnionOfAccountInfo: false,
        });
        if (thirdPartyUser.length > 0) {
            assert_1.default(thirdPartyUser.length === 1);
            let userBasedOnEmail = yield mockCore_1.mockListUsersByAccountInfo({
                accountInfo: {
                    email,
                },
                doUnionOfAccountInfo: false,
            });
            if (thirdPartyUser[0].isPrimaryUser === true) {
                for (let i = 0; i < userBasedOnEmail.length; i++) {
                    if (userBasedOnEmail[i].isPrimaryUser) {
                        if (userBasedOnEmail[i].id !== thirdPartyUser[0].id) {
                            return {
                                status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                                reason: "Email already associated with another primary user.",
                            };
                        } else if (!isVerified) {
                            userBasedOnEmail[i].loginMethods.forEach((loginMethod) => {
                                if (loginMethod.hasSameEmailAs(email) && loginMethod.verified) {
                                    shouldMarkInputEmailVerified = true;
                                }
                            });
                        }
                    }
                }
            } else if (isAccountLinkingEnabled && !isVerified) {
                // this means that we are signing in a recipe user id
                let primaryUserForEmail = userBasedOnEmail.filter((u) => u.isPrimaryUser);
                if (primaryUserForEmail.length === 1 && primaryUserForEmail[0].id !== thirdPartyUser[0].id) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason:
                            "New email is associated with primary user ID, this user is a recipe user and is not verified",
                    };
                }
            }
        }
        let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/signinup"), {
            thirdPartyId,
            thirdPartyUserId,
            email: { id: email },
        });
        if (response.status === "OK" && (shouldMarkInputEmailVerified || (response.createdNewUser && isVerified))) {
            // We mark this user's email as verified if:
            //  - This is a sign in, their email is unverified, but other linked accounts email is verified.
            //  - This is a sign up, and the email is verified.
            // These asserts are just there to detect bugs.
            if (shouldMarkInputEmailVerified) {
                assert_1.default(response.createdNewUser === false);
                assert_1.default(!isVerified);
            }
            let recipeUserId = undefined;
            let user = yield mockCore_1.mockGetUser({
                userId: response.user.id,
            });
            user.loginMethods.forEach((loginMethod) => {
                if (
                    loginMethod.hasSameThirdPartyInfoAs({
                        id: thirdPartyId,
                        userId: thirdPartyUserId,
                    })
                ) {
                    recipeUserId = loginMethod.recipeUserId;
                }
            });
            let EmailVerification = require("../emailverification");
            try {
                let tokenResp = yield EmailVerification.createEmailVerificationToken(recipeUserId);
                if (tokenResp.status === "OK") {
                    yield EmailVerification.verifyEmailUsingToken(tokenResp.token);
                }
            } catch (err) {
                if (err.message === "Initialisation not done. Did you forget to call the SuperTokens.init function?") {
                    // this means email verification is not enabled.. So we just ignore.
                } else {
                    throw err;
                }
            }
        }
        return {
            status: "OK",
            createdNewUser: response.createdNewUser,
            user: yield mockCore_1.mockGetUser({
                userId: response.user.id,
            }),
        };
    });
}
exports.mockCreateNewOrUpdateEmailOfRecipeUser = mockCreateNewOrUpdateEmailOfRecipeUser;
