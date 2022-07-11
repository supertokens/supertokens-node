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
const url_1 = require("url");
const axios = require("axios");
const qs = require("querystring");
function getAPIInterface() {
    return {
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
                let userInfo;
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
                            accept: "application/json",
                        },
                    });
                }
                userInfo = yield providerInfo.getProfileInfo(accessTokenAPIResponse.data, userContext);
                let emailInfo = userInfo.email;
                if (emailInfo === undefined) {
                    return {
                        status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                    };
                }
                let response = yield options.recipeImplementation.signInUp({
                    thirdPartyId: provider.id,
                    thirdPartyUserId: userInfo.id,
                    email: emailInfo,
                    userContext,
                });
                // we set the email as verified if already verified by the OAuth provider.
                // This block was added because of https://github.com/supertokens/supertokens-core/issues/295
                if (emailInfo.isVerified) {
                    const tokenResponse = yield options.emailVerificationRecipeImplementation.createEmailVerificationToken(
                        {
                            userId: response.user.id,
                            email: response.user.email,
                            userContext,
                        }
                    );
                    if (tokenResponse.status === "OK") {
                        yield options.emailVerificationRecipeImplementation.verifyEmailUsingToken({
                            token: tokenResponse.token,
                            userContext,
                        });
                    }
                }
                let session = yield session_1.default.createNewSession(
                    options.res,
                    response.user.id,
                    {},
                    {},
                    userContext
                );
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
                    session,
                    authCodeResponse: accessTokenAPIResponse.data,
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
    "467101b197249757c71f",
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
