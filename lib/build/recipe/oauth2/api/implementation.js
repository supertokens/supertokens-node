"use strict";
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_1 = __importDefault(require("../../../supertokens"));
function getAPIImplementation() {
    return {
        loginGET: async ({ loginChallenge, options, session, userContext }) => {
            var _a, _b;
            const request = await options.recipeImplementation.getLoginRequest({
                challenge: loginChallenge,
                userContext,
            });
            if (request.skip) {
                const accept = await options.recipeImplementation.acceptLoginRequest({
                    challenge: loginChallenge,
                    subject: request.subject,
                    userContext,
                });
                return { redirectTo: accept.redirectTo };
            } else if (session) {
                if (session.getUserId() !== request.subject) {
                    // TODO?
                }
                const accept = await options.recipeImplementation.acceptLoginRequest({
                    challenge: loginChallenge,
                    subject: session.getUserId(),
                    identityProviderSessionId: session.getHandle(),
                    userContext,
                });
                return { redirectTo: accept.redirectTo };
            }
            const appInfo = supertokens_1.default.getInstanceOrThrowError().appInfo;
            const websiteDomain = appInfo
                .getOrigin({
                    request: options.req,
                    userContext: userContext,
                })
                .getAsStringDangerous();
            const websiteBasePath = appInfo.websiteBasePath.getAsStringDangerous();
            // TODO:
            return {
                redirectTo:
                    websiteDomain +
                    websiteBasePath +
                    `?hint=${
                        (_b = (_a = request.oidcContext) === null || _a === void 0 ? void 0 : _a.login_hint) !== null &&
                        _b !== void 0
                            ? _b
                            : ""
                    }&loginChallenge=${loginChallenge}`,
            };
        },
        loginPOST: async ({ loginChallenge, accept, options, session, userContext }) => {
            const res = accept
                ? await options.recipeImplementation.acceptLoginRequest({
                      challenge: loginChallenge,
                      subject: session.getUserId(),
                      userContext,
                  })
                : await options.recipeImplementation.rejectLoginRequest({
                      challenge: loginChallenge,
                      error: { error: "access_denied", errorDescription: "The resource owner denied the request" },
                      userContext,
                  });
            return { redirectTo: res.redirectTo };
        },
        logoutGET: async ({ logoutChallenge, options, userContext }) => {
            const request = await options.recipeImplementation.getLogoutRequest({
                challenge: logoutChallenge,
                userContext,
            });
            const appInfo = supertokens_1.default.getInstanceOrThrowError().appInfo;
            return {
                redirectTo:
                    appInfo
                        .getOrigin({
                            request: options.req,
                            userContext: userContext,
                        })
                        .getAsStringDangerous() +
                    appInfo.websiteBasePath.getAsStringDangerous() +
                    `/logout?challenge=${request.challenge}`,
            };
        },
        logoutPOST: async ({ logoutChallenge, accept, options, userContext }) => {
            if (accept) {
                const res = await options.recipeImplementation.acceptLogoutRequest({
                    challenge: logoutChallenge,
                    userContext,
                });
                return { redirectTo: res.redirectTo };
            }
            await options.recipeImplementation.rejectLogoutRequest({
                challenge: logoutChallenge,
                //   error: { error: "access_denied", errorDescription: "The resource owner denied the request" },
                userContext,
            });
            const appInfo = supertokens_1.default.getInstanceOrThrowError().appInfo;
            return {
                redirectTo:
                    appInfo
                        .getOrigin({
                            request: options.req,
                            userContext: userContext,
                        })
                        .getAsStringDangerous() + appInfo.websiteBasePath.getAsStringDangerous(),
            };
        },
        consentGET: async ({ consentChallenge, options, userContext }) => {
            const request = await options.recipeImplementation.getConsentRequest({
                challenge: consentChallenge,
                userContext,
            });
            const appInfo = supertokens_1.default.getInstanceOrThrowError().appInfo;
            return {
                redirectTo:
                    appInfo
                        .getOrigin({
                            request: options.req,
                            userContext: userContext,
                        })
                        .getAsStringDangerous() +
                    appInfo.websiteBasePath.getAsStringDangerous() +
                    `/consent?challenge=${request.challenge}&scopes=${request.requestedScope}&client=${request.client}&`,
            };
        },
        consentPOST: async ({ consentChallenge, accept, remember, grantScope, options, userContext }) => {
            const request = await options.recipeImplementation.getConsentRequest({
                challenge: consentChallenge,
                userContext,
            });
            const res = accept
                ? await options.recipeImplementation.acceptConsentRequest({
                      challenge: consentChallenge,
                      grantAccessTokenAudience: request.requestedAccessTokenAudience,
                      remember,
                      grantScope,
                      userContext,
                  })
                : await options.recipeImplementation.rejectConsentRequest({
                      challenge: consentChallenge,
                      error: { error: "access_denied", errorDescription: "The resource owner denied the request" },
                      userContext,
                  });
            return { redirectTo: res.redirectTo };
        },
        authGET: async (input) => {
            const res = await input.options.recipeImplementation.authorization({
                params: input.params,
                cookies: input.cookie,
                session: input.session,
                userContext: input.userContext,
            });
            return res;
        },
        tokenPOST: async (input) => {
            return input.options.recipeImplementation.token({ body: input.body, userContext: input.userContext });
        },
        loginInfoGET: async ({ loginChallenge, options, userContext }) => {
            const { client } = await options.recipeImplementation.getLoginRequest({
                challenge: loginChallenge,
                userContext,
            });
            return {
                status: "OK",
                info: {
                    clientName: client.clientName,
                    tosUri: client.tosUri,
                    policyUri: client.policyUri,
                    logoUri: client.logoUri,
                    metadata: client.metadata,
                },
            };
        },
    };
}
exports.default = getAPIImplementation;
