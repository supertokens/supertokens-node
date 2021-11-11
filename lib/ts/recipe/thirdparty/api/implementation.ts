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
            let providerInfo = provider.get(undefined, undefined);

            let params: { [key: string]: string } = {};
            let keys = Object.keys(providerInfo.authorisationRedirect.params);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let value = providerInfo.authorisationRedirect.params[key];
                params[key] = typeof value === "function" ? await value(options.req.original) : value;
            }
            if (providerInfo.getRedirectURI !== undefined && !isUsingDevelopmentClientId(providerInfo.getClientId())) {
                // the backend wants to set the redirectURI - so we set that here.

                // we add the not development keys because the oauth provider will
                // redirect to supertokens.io's URL which will redirect the app
                // to the the user's website, which will handle the callback as usual.
                // If we add this, then instead, the supertokens' site will redirect
                // the user to this API layer, which is not needed.
                params["redirect_uri"] = providerInfo.getRedirectURI();
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
            clientId?: string;
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
                let providerInfo = provider.get(undefined, undefined);
                if (isUsingDevelopmentClientId(providerInfo.getClientId())) {
                    redirectURI = DEV_OAUTH_REDIRECT_URL;
                } else if (providerInfo.getRedirectURI !== undefined) {
                    // we overwrite the redirectURI provided by the frontend
                    // since the backend wants to take charge of setting this.
                    redirectURI = providerInfo.getRedirectURI();
                }
            }

            let providerInfo = provider.get(redirectURI, code);

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

            try {
                userInfo = await providerInfo.getProfileInfo(accessTokenAPIResponse.data);
            } catch (err) {
                if ((err as any).message !== undefined) {
                    return {
                        status: "FIELD_ERROR",
                        error: (err as any).message,
                    };
                }
                throw err;
            }

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

        appleRedirectHandlerPOST: async function ({ code, state, options }): Promise<void> {
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
