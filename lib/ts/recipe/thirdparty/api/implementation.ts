import { APIInterface, APIOptions, User, TypeProvider } from "../";
import Session from "../../session";
import { URLSearchParams } from "url";
import * as axios from "axios";
import * as qs from "querystring";

export default function getAPIInterface(): APIInterface {
    return {
        authorisationUrlGET: async function ({
            provider,
            options,
        }: {
            provider: TypeProvider;
            options: APIOptions;
        }): Promise<{
            status: "OK";
            url: string;
        }> {
            let providerInfo = await provider.get(undefined, undefined);

            let params: { [key: string]: string } = {};
            let keys = Object.keys(providerInfo.authorisationRedirect.params);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let value = providerInfo.authorisationRedirect.params[key];
                params[key] = typeof value === "function" ? await value(options.req.original) : value;
            }

            if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                params["actual_redirect_uri"] = providerInfo.authorisationRedirect.url;

                Object.keys(params).forEach((key) => {
                    if (params[key] === providerInfo.getClientId()) {
                        params[key] = getActualClientIdFromDevelopmentClientId(providerInfo.getClientId());
                    }
                });
            }

            let paramsString = new URLSearchParams(params).toString();

            let url = `${providerInfo.authorisationRedirect.url}?${paramsString}`;

            if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                url = `${DEV_OAUTH_AUTHORIZATION_URL}?${paramsString}`;
            }

            return {
                status: "OK",
                url,
            };
        },
        signInUpPOST: async function ({
            provider,
            code,
            redirectURI,
            authCodeResponse,
            options,
        }: {
            provider: TypeProvider;
            code: string;
            redirectURI: string;
            authCodeResponse?: any;
            options: APIOptions;
        }): Promise<
            | {
                  status: "OK";
                  createdNewUser: boolean;
                  user: User;
                  authCodeResponse: any;
              }
            | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
            | {
                  status: "FIELD_ERROR";
                  error: string;
              }
        > {
            let userInfo;
            let accessTokenAPIResponse: any;

            {
                let providerInfo = await provider.get(undefined, undefined);
                if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                    redirectURI = DEV_OAUTH_REDIRECT_URL;
                }
            }

            let providerInfo = await provider.get(redirectURI, code);

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
                accessTokenAPIResponse = await axios.default({
                    method: "post",
                    url: providerInfo.accessTokenAPI.url,
                    data: qs.stringify(providerInfo.accessTokenAPI.params),
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        accept: "application/json", // few providers like github don't send back json response by default
                    },
                });
            }

            userInfo = await providerInfo.getProfileInfo(accessTokenAPIResponse.data);

            let emailInfo = userInfo.email;
            if (emailInfo === undefined) {
                return {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER",
                };
            }
            let response = await options.recipeImplementation.signInUp({
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
                const tokenResponse = await options.emailVerificationRecipeImplementation.createEmailVerificationToken({
                    userId: response.user.id,
                    email: response.user.email,
                });

                if (tokenResponse.status === "OK") {
                    await options.emailVerificationRecipeImplementation.verifyEmailUsingToken({
                        token: tokenResponse.token,
                    });
                }
            }

            await Session.createNewSession(options.res, response.user.id, {}, {});
            return {
                status: "OK",
                createdNewUser: response.createdNewUser,
                user: response.user,
                authCodeResponse: accessTokenAPIResponse.data,
            };
        },
    };
}

const DEV_OAUTH_AUTHORIZATION_URL = "https://supertokens.io/dev/oauth/redirect-to-provider";
const DEV_OAUTH_REDIRECT_URL = "https://supertokens.io/dev/oauth/redirect-to-app";

// If Third Party login is used with one of the following development keys, then the dev authorization url and the redirect url will be used.
const DEV_OAUTH_CLIENT_IDS = [
    "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com", // google
    "467101b197249757c71f", // github
];
const DEV_KEY_IDENTIFIER = "4398792-";

function isUsingDevelopmentClientId(client_id: string): boolean {
    return client_id.startsWith(DEV_KEY_IDENTIFIER) || DEV_OAUTH_CLIENT_IDS.includes(client_id);
}

export function getActualClientIdFromDevelopmentClientId(client_id: string): string {
    if (client_id.startsWith(DEV_KEY_IDENTIFIER)) {
        return client_id.split(DEV_KEY_IDENTIFIER)[1];
    }
    return client_id;
}
