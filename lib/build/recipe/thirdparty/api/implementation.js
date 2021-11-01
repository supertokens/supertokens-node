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
        authorisationUrlGET: function ({ provider, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                let providerInfo = yield provider.get(undefined, undefined);
                let params = {};
                let keys = Object.keys(providerInfo.authorisationRedirect.params);
                for (let i = 0; i < keys.length; i++) {
                    let key = keys[i];
                    let value = providerInfo.authorisationRedirect.params[key];
                    params[key] = typeof value === "function" ? yield value(options.req.original) : value;
                }
                if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                    params["actual_redirect_uri"] = providerInfo.authorisationRedirect.url;
                    Object.keys(params).forEach((key) => {
                        if (params[key] === providerInfo.getClientId()) {
                            params[key] = getActualClientIdFromDevelopmentClientId(providerInfo.getClientId());
                        }
                    });
                }
                let paramsString = new url_1.URLSearchParams(params).toString();
                let url = `${providerInfo.authorisationRedirect.url}?${paramsString}`;
                if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                    url = `${DEV_OAUTH_AUTHORIZATION_URL}?${paramsString}`;
                }
                return {
                    status: "OK",
                    url,
                };
            });
        },
        signInUpPOST: function ({ provider, code, redirectURI, authCodeResponse, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                let userInfo;
                let accessTokenAPIResponse;
                {
                    let providerInfo = yield provider.get(undefined, undefined);
                    if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                        redirectURI = DEV_OAUTH_REDIRECT_URL;
                    } else if (providerInfo.getRedirectURI !== undefined) {
                        redirectURI = providerInfo.getRedirectURI();
                    }
                }
                let providerInfo = yield provider.get(redirectURI, code);
                if (authCodeResponse !== undefined) {
                    accessTokenAPIResponse = {
                        data: authCodeResponse,
                    };
                } else {
                    // we should use code to get the authCodeResponse body
                    if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                        Object.keys(providerInfo.accessTokenAPI.params).forEach((key) => {
                            if (providerInfo.accessTokenAPI.params[key] === providerInfo.getClientId()) {
                                providerInfo.accessTokenAPI.params[key] = getActualClientIdFromDevelopmentClientId(
                                    providerInfo.getClientId()
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
                userInfo = yield providerInfo.getProfileInfo(accessTokenAPIResponse.data);
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
                });
                if (response.status === "FIELD_ERROR") {
                    return response;
                }
                // we set the email as verified if already verified by the OAuth provider.
                // This block was added because of https://github.com/supertokens/supertokens-core/issues/295
                if (emailInfo.isVerified) {
                    const tokenResponse = yield options.emailVerificationRecipeImplementation.createEmailVerificationToken(
                        {
                            userId: response.user.id,
                            email: response.user.email,
                        }
                    );
                    if (tokenResponse.status === "OK") {
                        yield options.emailVerificationRecipeImplementation.verifyEmailUsingToken({
                            token: tokenResponse.token,
                        });
                    }
                }
                yield session_1.default.createNewSession(options.res, response.user.id, {}, {});
                return {
                    status: "OK",
                    createdNewUser: response.createdNewUser,
                    user: response.user,
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
