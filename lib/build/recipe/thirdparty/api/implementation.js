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
const session_1 = __importDefault(require("../../session"));
const recipe_1 = __importDefault(require("../../accountlinking/recipe"));
const __1 = require("../../..");
function getAPIInterface() {
    return {
        authorisationUrlGET: function ({ provider, redirectURIOnProviderDashboard, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const authUrl = yield provider.getAuthorisationRedirectURL({
                    redirectURIOnProviderDashboard,
                    userContext,
                });
                return Object.assign({ status: "OK" }, authUrl);
            });
        },
        signInUpPOST: function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                const { provider, tenantId, options, userContext } = input;
                let oAuthTokensToUse = {};
                if ("redirectURIInfo" in input && input.redirectURIInfo !== undefined) {
                    oAuthTokensToUse = yield provider.exchangeAuthCodeForOAuthTokens({
                        redirectURIInfo: input.redirectURIInfo,
                        userContext,
                    });
                } else if ("oAuthTokens" in input && input.oAuthTokens !== undefined) {
                    oAuthTokensToUse = input.oAuthTokens;
                } else {
                    throw Error("should never come here");
                }
                const userInfo = yield provider.getUserInfo({ oAuthTokens: oAuthTokensToUse, userContext });
                if (userInfo.email === undefined && provider.config.requireEmail === false) {
                    userInfo.email = {
                        id: yield provider.config.generateFakeEmail({
                            thirdPartyUserId: userInfo.thirdPartyUserId,
                            tenantId,
                            userContext,
                        }),
                        isVerified: true,
                    };
                }
                let emailInfo = userInfo.email;
                if (emailInfo === undefined) {
                    return {
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    };
                }
                let response = yield options.recipeImplementation.signInUp({
                    thirdPartyId: provider.id,
                    thirdPartyUserId: userInfo.thirdPartyUserId,
                    email: emailInfo.id,
                    isVerified: emailInfo.isVerified,
                    oAuthTokens: oAuthTokensToUse,
                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                    tenantId,
                    userContext,
                });
                if (response.status === "SIGN_IN_UP_NOT_ALLOWED") {
                    return response;
                }
                let loginMethod = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                            id: provider.id,
                            userId: userInfo.thirdPartyUserId,
                        })
                    ) {
                        loginMethod = response.user.loginMethods[i];
                    }
                }
                if (loginMethod === undefined) {
                    throw new Error("Should never come here");
                }
                const existingUsers = yield __1.listUsersByAccountInfo({
                    email: emailInfo.id,
                });
                if (existingUsers.length > 0) {
                    // Here we do this check after sign in is done cause:
                    // - We first want to check if the credentials are correct first or not
                    // - The above recipe function marks the email as verified if other linked users
                    // with the same email are verified. The function below checks for the email verification
                    // so we want to call it only once this is up to date,
                    // - Even though the above call to signInUp is state changing (it changes the email
                    // of the user), it's OK to do this check here cause the isSignInAllowed checks
                    // conditions related to account linking and not related to email change. Email change
                    // condition checking happens before calling the recipe function anyway.
                    let isSignInAllowed = yield recipe_1.default.getInstance().isSignInAllowed({
                        recipeUserId: loginMethod.recipeUserId,
                        userContext,
                    });
                    if (!isSignInAllowed) {
                        return {
                            status: "SIGN_IN_UP_NOT_ALLOWED",
                            reason: "Cannot sign in / up due to security reasons. Please contact support.",
                        };
                    }
                    // we do account linking only during sign in here cause during sign up,
                    // the recipe function above does account linking for us.
                    let userId = yield recipe_1.default.getInstance().createPrimaryUserIdOrLinkAccounts({
                        tenantId,
                        recipeUserId: loginMethod.recipeUserId,
                        checkAccountsToLinkTableAsWell: true,
                        userContext,
                    });
                    response.user = yield __1.getUser(userId, userContext);
                }
                let session = yield session_1.default.createNewSession(
                    options.req,
                    options.res,
                    tenantId,
                    loginMethod.recipeUserId,
                    {},
                    {},
                    userContext
                );
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                    session,
                    oAuthTokens: oAuthTokensToUse,
                    rawUserInfoFromProvider: userInfo.rawUserInfoFromProvider,
                };
            });
        },
        appleRedirectHandlerPOST: function ({ formPostInfoFromProvider, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                const stateInBase64 = formPostInfoFromProvider.state;
                const state = Buffer.from(stateInBase64, "base64").toString();
                const stateObj = JSON.parse(state);
                const redirectURI = stateObj.redirectURI;
                const urlObj = new URL(redirectURI);
                for (const [key, value] of Object.entries(formPostInfoFromProvider)) {
                    urlObj.searchParams.set(key, `${value}`);
                }
                options.res.setHeader("Location", urlObj.toString(), false);
                options.res.setStatusCode(303);
                options.res.sendHTMLResponse("");
            });
        },
    };
}
exports.default = getAPIInterface;
