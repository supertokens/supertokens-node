"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
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
exports.getActualClientIdFromDevelopmentClientId = void 0;
const session_1 = __importDefault(require("../../session"));
const url_1 = require("url");
const axios = __importStar(require("axios"));
const qs = __importStar(require("querystring"));
const recipe_1 = __importDefault(require("../../emailverification/recipe"));
const recipe_2 = __importDefault(require("../../accountlinking/recipe"));
const __1 = require("../../..");
const accountlinking_1 = require("../../accountlinking");
const utils_1 = require("../../emailverification/utils");
const logger_1 = require("../../../logger");
function getAPIInterface() {
    return {
        linkAccountWithUserFromSessionPOST: function ({
            provider,
            code,
            redirectURI,
            authCodeResponse,
            clientId,
            fromProvider,
            session,
            options,
            userContext,
        }) {
            return __awaiter(this, void 0, void 0, function* () {
                // we pass fromProvider as an input to this function cause in the logic below,
                // we can do recursion as well, and in that case, we cannot re consume the auth code
                // (since they are one time use only) - therefore, we pass the  previously
                // fetched fromProvider when recursing and reuse that.
                fromProvider =
                    fromProvider === undefined
                        ? yield getUserInfoFromAuthCode(provider, code, redirectURI, authCodeResponse, userContext)
                        : fromProvider;
                const emailInfo = fromProvider.userInfo.email;
                if (emailInfo === undefined) {
                    return {
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    };
                }
                const createRecipeUserFunc = (userContext) =>
                    __awaiter(this, void 0, void 0, function* () {
                        let resp = yield options.recipeImplementation.createNewOrUpdateEmailOfRecipeUser({
                            thirdPartyId: provider.id,
                            thirdPartyUserId: fromProvider.userInfo.id,
                            email: emailInfo.id,
                            userContext,
                        });
                        if (resp.status === "OK") {
                            if (resp.createdNewUser) {
                                if (emailInfo.isVerified) {
                                    const emailVerificationInstance = recipe_1.default.getInstance();
                                    if (emailVerificationInstance) {
                                        const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                                            {
                                                recipeUserId: resp.user.loginMethods[0].recipeUserId,
                                                email: emailInfo.id,
                                                userContext,
                                            }
                                        );
                                        if (tokenResponse.status === "OK") {
                                            yield emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
                                                token: tokenResponse.token,
                                                attemptAccountLinking: false,
                                                // already try and do account linking.
                                                userContext,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        // the other status type of EMAIL_CHANGE_NOT_ALLOWED_ERROR should not happen
                        // cause that is only possible when signing in, and here we only try and create
                        // a new user.
                    });
                const verifyCredentialsFunc = (userContext) =>
                    __awaiter(this, void 0, void 0, function* () {
                        let resp = yield options.recipeImplementation.createNewOrUpdateEmailOfRecipeUser({
                            thirdPartyId: provider.id,
                            thirdPartyUserId: fromProvider.userInfo.id,
                            email: emailInfo.id,
                            userContext,
                        });
                        if (resp.status === "OK") {
                            return {
                                status: "OK",
                            };
                        }
                        return {
                            status: "CUSTOM_RESPONSE",
                            resp: {
                                status: "SIGN_IN_NOT_ALLOWED",
                                reason: resp.reason,
                            },
                        };
                    });
                let accountLinkingInstance = recipe_2.default.getInstance();
                let result = yield accountLinkingInstance.linkAccountWithUserFromSession({
                    session,
                    newUser: {
                        email: emailInfo.id,
                        thirdParty: {
                            id: provider.id,
                            userId: fromProvider.userInfo.id,
                        },
                        recipeId: "thirdparty",
                    },
                    createRecipeUserFunc,
                    verifyCredentialsFunc,
                    userContext,
                });
                if (result.status === "CUSTOM_RESPONSE") {
                    return result.resp;
                } else if (result.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
                    // this will store in the db that these need to be linked,
                    // and after verification, it will link these accounts.
                    let toLinkResult = yield accountlinking_1.storeIntoAccountToLinkTable(
                        result.recipeUserId,
                        result.primaryUserId,
                        userContext
                    );
                    if (toLinkResult.status === "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR") {
                        if (toLinkResult.primaryUserId === result.primaryUserId) {
                            // this is some sort of a race condition issue, so we just ignore it
                            // since we already linked to the session's account anyway...
                            return {
                                status: "OK",
                                wereAccountsAlreadyLinked: true,
                                authCodeResponse: fromProvider.authCodeResponse,
                            };
                        } else {
                            return {
                                status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR",
                                description:
                                    "Input user is already linked to another account. Please try again or contact support.",
                            };
                        }
                    } else if (toLinkResult.status === "INPUT_USER_ID_IS_NOT_A_PRIMARY_USER_ERROR") {
                        // this can happen due to a race condition wherein
                        // by the time the code comes here, the input primary user is no more a
                        // primary user. So we can do recursion and then linkAccountWithUserFromSession
                        // will try and make the session user a primary user again
                        return this.linkAccountWithUserFromSessionPOST({
                            provider,
                            code,
                            redirectURI,
                            authCodeResponse,
                            clientId,
                            fromProvider,
                            session,
                            options,
                            userContext,
                        });
                    }
                    // status: "OK"
                    // we now send an email verification email to this user.
                    const emailVerificationInstance = recipe_1.default.getInstance();
                    if (emailVerificationInstance) {
                        const tokenResponse = yield emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
                            {
                                recipeUserId: result.recipeUserId,
                                email: fromProvider.userInfo.email.id,
                                userContext,
                            }
                        );
                        if (tokenResponse.status === "OK") {
                            let emailVerifyLink = utils_1.getEmailVerifyLink({
                                appInfo: options.appInfo,
                                token: tokenResponse.token,
                                recipeId: options.recipeId,
                            });
                            logger_1.logDebugMessage(
                                `Sending email verification email to ${fromProvider.userInfo.email.id}`
                            );
                            yield emailVerificationInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
                                type: "EMAIL_VERIFICATION",
                                user: {
                                    // we send the session's user ID here cause
                                    // we will be linking this user ID and the result.recipeUserId
                                    // eventually.
                                    id: session.getUserId(),
                                    recipeUserId: result.recipeUserId,
                                    email: fromProvider.userInfo.email.id,
                                },
                                emailVerifyLink,
                                userContext,
                            });
                        } else {
                            // this means that the email is already verified. It can come here
                            // cause of a race condition, so we just try again
                            return this.linkAccountWithUserFromSessionPOST({
                                provider,
                                code,
                                redirectURI,
                                authCodeResponse,
                                clientId,
                                fromProvider,
                                session,
                                options,
                                userContext,
                            });
                        }
                    } else {
                        throw new Error(
                            "Developer configuration error - email verification is required, but the email verification recipe has not been initialized."
                        );
                    }
                    return {
                        status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
                        authCodeResponse: fromProvider.authCodeResponse,
                        recipeUserId: result.recipeUserId.getAsString(),
                        email: fromProvider.userInfo.email.id,
                        primaryUserId: result.primaryUserId,
                        description:
                            "Before accounts can be linked, the new account must be verified, and an email verification email has been sent already.",
                    };
                } else if (result.status === "OK") {
                    return {
                        authCodeResponse: fromProvider.authCodeResponse,
                        status: "OK",
                        wereAccountsAlreadyLinked: result.wereAccountsAlreadyLinked,
                    };
                }
                // status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR"
                return result;
            });
        },
        authorisationUrlGET: function ({ provider, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let providerInfo = provider.get(undefined, undefined, userContext);
                let params = {};
                let keys = Object.keys(providerInfo.authorisationRedirect.params);
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    let value = providerInfo.authorisationRedirect.params[key];
                    params[key] = typeof value === "function" ? yield value(options.req.original) : value;
                }
                if (
                    providerInfo.getRedirectURI !== undefined &&
                    !isUsingDevelopmentClientId(providerInfo.getClientId(userContext))
                ) {
                    // the backend wants to set the redirectURI - so we set that here.
                    // we add the not development keys because the oauth provider will
                    // redirect to supertokens.io's URL which will redirect the app
                    // to the the user's website, which will handle the callback as usual.
                    // If we add this, then instead, the supertokens' site will redirect
                    // the user to this API layer, which is not needed.
                    params["redirect_uri"] = providerInfo.getRedirectURI(userContext);
                }
                if (isUsingDevelopmentClientId(providerInfo.getClientId(userContext))) {
                    params["actual_redirect_uri"] = providerInfo.authorisationRedirect.url;
                    Object.keys(params).forEach((key) => {
                        if (params[key] === providerInfo.getClientId(userContext)) {
                            params[key] = getActualClientIdFromDevelopmentClientId(
                                providerInfo.getClientId(userContext)
                            );
                        }
                    });
                }
                let paramsString = new url_1.URLSearchParams(params).toString();
                let url = `${providerInfo.authorisationRedirect.url}?${paramsString}`;
                if (isUsingDevelopmentClientId(providerInfo.getClientId(userContext))) {
                    url = `${DEV_OAUTH_AUTHORIZATION_URL}?${paramsString}`;
                }
                return {
                    status: "OK",
                    url,
                };
            });
        },
        signInUpPOST: function ({ provider, code, redirectURI, authCodeResponse, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                const fromProvider = yield getUserInfoFromAuthCode(
                    provider,
                    code,
                    redirectURI,
                    authCodeResponse,
                    userContext
                );
                const userInfo = fromProvider.userInfo;
                let emailInfo = userInfo.email;
                if (emailInfo === undefined) {
                    return {
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    };
                }
                let existingUser = yield __1.listUsersByAccountInfo(
                    {
                        thirdParty: {
                            id: provider.id,
                            userId: userInfo.id,
                        },
                    },
                    false,
                    userContext
                );
                if (existingUser.length === 0) {
                    let isSignUpAllowed = yield recipe_2.default.getInstance().isSignUpAllowed({
                        newUser: {
                            recipeId: "thirdparty",
                            email: emailInfo.id,
                        },
                        isVerified: emailInfo.isVerified,
                        userContext,
                    });
                    if (!isSignUpAllowed) {
                        // On the frontend, this should show a UI of asking the user
                        // to login using a different method.
                        return {
                            status: "EMAIL_ALREADY_USED_IN_ANOTHER_ACCOUNT",
                        };
                    }
                }
                let response = yield options.recipeImplementation.signInUp({
                    thirdPartyId: provider.id,
                    thirdPartyUserId: userInfo.id,
                    email: emailInfo.id,
                    isVerified: emailInfo.isVerified,
                    userContext,
                });
                if (response.status === "SIGN_IN_NOT_ALLOWED") {
                    return response;
                }
                let loginMethod = undefined;
                for (let i = 0; i < response.user.loginMethods.length; i++) {
                    if (
                        response.user.loginMethods[i].hasSameThirdPartyInfoAs({
                            id: provider.id,
                            userId: userInfo.id,
                        })
                    ) {
                        loginMethod = response.user.loginMethods[i];
                    }
                }
                if (loginMethod === undefined) {
                    throw new Error("Should never come here");
                }
                let session = yield session_1.default.createNewSession(
                    options.req,
                    options.res,
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
                    authCodeResponse: fromProvider.authCodeResponse,
                };
            });
        },
        appleRedirectHandlerPOST: function ({ code, state, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                const redirectURL =
                    options.appInfo.websiteDomain.getAsStringDangerous() +
                    options.appInfo.websiteBasePath.getAsStringDangerous() +
                    "/callback/apple?state=" +
                    state +
                    "&code=" +
                    code;
                options.res.sendHTMLResponse(
                    `<html><head><script>window.location.replace("${redirectURL}");</script></head></html>`
                );
            });
        },
    };
}
exports.default = getAPIInterface;
const DEV_OAUTH_AUTHORIZATION_URL = "https://supertokens.io/dev/oauth/redirect-to-provider";
const DEV_OAUTH_REDIRECT_URL = "https://supertokens.io/dev/oauth/redirect-to-app";
// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
const DEV_OAUTH_CLIENT_IDS = [
    "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
    "467101b197249757c71f", // github
];
const DEV_KEY_IDENTIFIER = "4398792-";
function isUsingDevelopmentClientId(client_id) {
    return client_id.startsWith(DEV_KEY_IDENTIFIER) || DEV_OAUTH_CLIENT_IDS.includes(client_id);
}
function getActualClientIdFromDevelopmentClientId(client_id) {
    if (client_id.startsWith(DEV_KEY_IDENTIFIER)) {
        return client_id.split(DEV_KEY_IDENTIFIER)[1];
    }
    return client_id;
}
exports.getActualClientIdFromDevelopmentClientId = getActualClientIdFromDevelopmentClientId;
function getUserInfoFromAuthCode(provider, code, redirectURI, authCodeResponse, userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        // first we query the provider to get info from it.
        let accessTokenAPIResponse;
        {
            let providerInfo = provider.get(undefined, undefined, userContext);
            if (isUsingDevelopmentClientId(providerInfo.getClientId(userContext))) {
                redirectURI = DEV_OAUTH_REDIRECT_URL;
            } else if (providerInfo.getRedirectURI !== undefined) {
                // we overwrite the redirectURI provided by the frontend
                // since the backend wants to take charge of setting this.
                redirectURI = providerInfo.getRedirectURI(userContext);
            }
        }
        let providerInfo = provider.get(redirectURI, code, userContext);
        if (authCodeResponse !== undefined) {
            accessTokenAPIResponse = {
                data: authCodeResponse,
            };
        } else {
            // we should use code to get the authCodeResponse body
            if (isUsingDevelopmentClientId(providerInfo.getClientId(userContext))) {
                Object.keys(providerInfo.accessTokenAPI.params).forEach((key) => {
                    if (providerInfo.accessTokenAPI.params[key] === providerInfo.getClientId(userContext)) {
                        providerInfo.accessTokenAPI.params[key] = getActualClientIdFromDevelopmentClientId(
                            providerInfo.getClientId(userContext)
                        );
                    }
                });
            }
            accessTokenAPIResponse = yield axios.default({
                method: "post",
                url: providerInfo.accessTokenAPI.url,
                data: qs.stringify(providerInfo.accessTokenAPI.params),
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    accept: "application/json", // few providers like github don't send back json response by default
                },
            });
        }
        return {
            userInfo: yield providerInfo.getProfileInfo(accessTokenAPIResponse.data, userContext),
            authCodeResponse: accessTokenAPIResponse.data,
        };
    });
}
