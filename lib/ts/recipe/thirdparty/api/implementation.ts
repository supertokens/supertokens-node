import { APIInterface, APIOptions, TypeProvider } from "../";
import Session from "../../session";
import { URLSearchParams } from "url";
import * as axios from "axios";
import * as qs from "querystring";
import { SessionContainerInterface } from "../../session/types";
import { GeneralErrorResponse } from "../../../types";
import { User } from "../../../types";
import type { RecipeLevelUser } from "../../accountlinking/types";
import AccountLinking from "../../accountlinking/recipe";
import { listUsersByAccountInfo, getUser } from "../../..";
import { UserInfo } from "../types";
import RecipeUserId from "../../../recipeUserId";
import EmailVerification from "../../emailverification";
import EmailVerificationRecipe from "../../emailverification/recipe";

export default function getAPIInterface(): APIInterface {
    return {
        // This is commented out because we have decided to not add this feature for now,
        // and add it at a later iteration in the project.
        // linkAccountWithUserFromSessionPOST: async function (
        //     this: APIInterface,
        //     {
        //         provider,
        //         code,
        //         redirectURI,
        //         authCodeResponse,
        //         clientId,
        //         fromProvider,
        //         session,
        //         options,
        //         userContext,
        //     }: {
        //         provider: TypeProvider;
        //         code: string;
        //         redirectURI: string;
        //         authCodeResponse?: any;
        //         clientId?: string;
        //         fromProvider:
        //         | {
        //             userInfo: UserInfo;
        //             authCodeResponse: any;
        //         }
        //         | undefined;
        //         session: SessionContainerInterface;
        //         options: APIOptions;
        //         userContext: any;
        //     }
        // ): Promise<
        //     | {
        //         status: "OK";
        //         wereAccountsAlreadyLinked: boolean;
        //         authCodeResponse: any;
        //     }
        //     | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
        //     | {
        //         status: "SIGN_IN_NOT_ALLOWED";
        //         reason: string;
        //     }
        //     | {
        //         status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
        //         description: string;
        //     }
        //     | {
        //         status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
        //         description: string;
        //         recipeUserId: string;
        //         primaryUserId: string;
        //         email: string;
        //         authCodeResponse: any;
        //     }
        //     | GeneralErrorResponse
        // > {
        //     // we pass fromProvider as an input to this function cause in the logic below,
        //     // we can do recursion as well, and in that case, we cannot re consume the auth code
        //     // (since they are one time use only) - therefore, we pass the  previously
        //     // fetched fromProvider when recursing and reuse that.
        //     fromProvider =
        //         fromProvider === undefined
        //             ? await getUserInfoFromAuthCode(provider, code, redirectURI, authCodeResponse, userContext)
        //             : fromProvider;

        //     const emailInfo = fromProvider.userInfo.email;

        //     if (emailInfo === undefined) {
        //         return {
        //             status: "NO_EMAIL_GIVEN_BY_PROVIDER",
        //         };
        //     }

        //     const createRecipeUserFunc = async (userContext: any): Promise<void> => {
        //         let resp = await options.recipeImplementation.createNewOrUpdateEmailOfRecipeUser({
        //             thirdPartyId: provider.id,
        //             thirdPartyUserId: fromProvider!.userInfo.id,
        //             email: emailInfo!.id,
        //             userContext,
        //         });

        //         if (resp.status === "OK") {
        //             if (resp.createdNewUser) {
        //                 if (emailInfo.isVerified) {
        //                     const emailVerificationInstance = EmailVerification.getInstance();
        //                     if (emailVerificationInstance) {
        //                         const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
        //                             {
        //                                 recipeUserId: resp.user.loginMethods[0].recipeUserId,
        //                                 email: emailInfo.id,
        //                                 userContext,
        //                             }
        //                         );

        //                         if (tokenResponse.status === "OK") {
        //                             await emailVerificationInstance.recipeInterfaceImpl.verifyEmailUsingToken({
        //                                 token: tokenResponse.token,
        //                                 attemptAccountLinking: false, // we pass this cause in this API, we
        //                                 // already try and do account linking.
        //                                 userContext,
        //                             });
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //         // the other status type of EMAIL_CHANGE_NOT_ALLOWED_ERROR should not happen
        //         // cause that is only possible when signing in, and here we only try and create
        //         // a new user.
        //     };

        //     const verifyCredentialsFunc = async (
        //         userContext: any
        //     ): Promise<
        //         | { status: "OK" }
        //         | {
        //             status: "CUSTOM_RESPONSE";
        //             resp: {
        //                 status: "SIGN_IN_NOT_ALLOWED";
        //                 reason: string;
        //             };
        //         }
        //     > => {
        //         let resp = await options.recipeImplementation.createNewOrUpdateEmailOfRecipeUser({
        //             thirdPartyId: provider.id,
        //             thirdPartyUserId: fromProvider!.userInfo.id,
        //             email: emailInfo!.id,
        //             userContext,
        //         });
        //         if (resp.status === "OK") {
        //             return {
        //                 status: "OK",
        //             };
        //         }
        //         return {
        //             status: "CUSTOM_RESPONSE",
        //             resp: {
        //                 status: "SIGN_IN_NOT_ALLOWED",
        //                 reason: resp.reason,
        //             },
        //         };
        //     };

        //     let accountLinkingInstance = AccountLinking.getInstance();
        //     let result = await accountLinkingInstance.linkAccountWithUserFromSession<{
        //         status: "SIGN_IN_NOT_ALLOWED";
        //         reason: string;
        //     }>({
        //         session,
        //         newUser: {
        //             email: emailInfo.id,
        //             thirdParty: {
        //                 id: provider.id,
        //                 userId: fromProvider.userInfo.id,
        //             },
        //             recipeId: "thirdparty",
        //         },
        //         createRecipeUserFunc,
        //         verifyCredentialsFunc,
        //         userContext,
        //     });
        //     if (result.status === "CUSTOM_RESPONSE") {
        //         return result.resp;
        //     } else if (result.status === "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR") {
        //         // we now send an email verification email to this user.
        //         const emailVerificationInstance = EmailVerification.getInstance();
        //         if (emailVerificationInstance) {
        //             const tokenResponse = await emailVerificationInstance.recipeInterfaceImpl.createEmailVerificationToken(
        //                 {
        //                     recipeUserId: result.recipeUserId,
        //                     email: fromProvider.userInfo.email!.id,
        //                     userContext,
        //                 }
        //             );

        //             if (tokenResponse.status === "OK") {
        //                 let emailVerifyLink = getEmailVerifyLink({
        //                     appInfo: options.appInfo,
        //                     token: tokenResponse.token,
        //                     recipeId: options.recipeId,
        //                 });

        //                 logDebugMessage(`Sending email verification email to ${fromProvider.userInfo.email!.id}`);
        //                 await emailVerificationInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
        //                     type: "EMAIL_VERIFICATION",
        //                     user: {
        //                         // we send the session's user ID here cause
        //                         // we will be linking this user ID and the result.recipeUserId
        //                         // eventually.
        //                         id: session.getUserId(),
        //                         recipeUserId: result.recipeUserId,
        //                         email: fromProvider.userInfo.email!.id,
        //                     },
        //                     emailVerifyLink,
        //                     userContext,
        //                 });
        //             } else {
        //                 // this means that the email is already verified. It can come here
        //                 // cause of a race condition, so we just try again
        //                 return this.linkAccountWithUserFromSessionPOST!({
        //                     provider,
        //                     code,
        //                     redirectURI,
        //                     authCodeResponse,
        //                     clientId,
        //                     fromProvider,
        //                     session,
        //                     options,
        //                     userContext,
        //                 });
        //             }
        //         } else {
        //             throw new Error(
        //                 "Developer configuration error - email verification is required, but the email verification recipe has not been initialized."
        //             );
        //         }

        //         return {
        //             status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR",
        //             authCodeResponse: fromProvider.authCodeResponse,
        //             recipeUserId: result.recipeUserId.getAsString(),
        //             email: fromProvider.userInfo.email!.id,
        //             primaryUserId: result.primaryUserId,
        //             description:
        //                 "Before accounts can be linked, the new account must be verified, and an email verification email has been sent already.",
        //         };
        //     } else if (result.status === "OK") {
        //         return {
        //             authCodeResponse: fromProvider.authCodeResponse,
        //             status: "OK",
        //             wereAccountsAlreadyLinked: result.wereAccountsAlreadyLinked,
        //         };
        //     }
        //     // status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR"
        //     return result;
        // },
        authorisationUrlGET: async function ({
            provider,
            options,
            userContext,
        }: {
            provider: TypeProvider;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  url: string;
              }
            | GeneralErrorResponse
        > {
            let providerInfo = provider.get(undefined, undefined, userContext);

            let params: { [key: string]: string } = {};
            let keys = Object.keys(providerInfo.authorisationRedirect.params);
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                let value = providerInfo.authorisationRedirect.params[key];
                params[key] = typeof value === "function" ? await value(options.req.original) : value;
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
                        params[key] = getActualClientIdFromDevelopmentClientId(providerInfo.getClientId(userContext));
                    }
                });
            }

            let paramsString = new URLSearchParams(params).toString();

            let url = `${providerInfo.authorisationRedirect.url}?${paramsString}`;

            if (isUsingDevelopmentClientId(providerInfo.getClientId(userContext))) {
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
            userContext,
        }: {
            provider: TypeProvider;
            code: string;
            redirectURI: string;
            authCodeResponse?: any;
            clientId?: string;
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
                  createdNewUser: boolean;
                  user: User;
                  session: SessionContainerInterface;
                  authCodeResponse: any;
              }
            | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
            | {
                  status: "SIGN_IN_UP_NOT_ALLOWED";
                  reason: string;
              }
            | {
                  status: "EMAIL_ALREADY_USED_IN_ANOTHER_ACCOUNT";
              }
            | GeneralErrorResponse
        > {
            const fromProvider = await getUserInfoFromAuthCode(
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

            let existingUsers = await listUsersByAccountInfo(
                {
                    thirdParty: {
                        id: provider.id,
                        userId: userInfo.id,
                    },
                },
                false,
                userContext
            );

            if (existingUsers.length === 0) {
                let isSignUpAllowed = await AccountLinking.getInstance().isSignUpAllowed({
                    newUser: {
                        recipeId: "thirdparty",
                        email: emailInfo.id,
                        thirdParty: {
                            id: provider.id,
                            userId: userInfo.id,
                        },
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
            } else {
                // this is a sign in. So before we proceed, we need to check if an email change
                // is allowed since the email could have changed from the social provider's side.
                // We do this check here and not in the recipe function cause we want to keep the
                // recipe function checks to a minimum so that the dev has complete control of
                // what they can do.

                // The isEmailChangeAllowed function takes in a isVerified boolean. Now, even though
                // we already have that from the input, that's just what the provider says. If the
                // provider says that the email is NOT verified, it could have been that the email
                // is verified on the user's account via supertokens on a previous sign in / up.
                // So we just check that as well before calling isEmailChangeAllowed

                if (existingUsers.length > 1) {
                    throw new Error(
                        "You have found a bug. Please report it on https://github.com/supertokens/supertokens-node/issues"
                    );
                }

                let recipeUserId: RecipeUserId | undefined = undefined;
                existingUsers[0].loginMethods.forEach((lM) => {
                    if (
                        lM.hasSameThirdPartyInfoAs({
                            id: provider.id,
                            userId: userInfo.id,
                        })
                    ) {
                        recipeUserId = lM.recipeUserId;
                    }
                });

                if (!emailInfo.isVerified && EmailVerificationRecipe.getInstance() !== undefined) {
                    emailInfo.isVerified = await EmailVerification.isEmailVerified(
                        recipeUserId!,
                        emailInfo.id,
                        userContext
                    );
                }

                let isEmailChangeAllowed = await AccountLinking.getInstance().isEmailChangeAllowed({
                    recipeUserId: recipeUserId!,
                    isVerified: emailInfo.isVerified,
                    newEmail: emailInfo.id,
                    userContext,
                });

                if (!isEmailChangeAllowed) {
                    return {
                        status: "SIGN_IN_UP_NOT_ALLOWED",
                        reason:
                            "Cannot sign in / up because new email cannot be applied to existing account. Please contact support.",
                    };
                }
            }

            let response = await options.recipeImplementation.signInUp({
                thirdPartyId: provider.id,
                thirdPartyUserId: userInfo.id,
                email: emailInfo.id,
                isVerified: emailInfo.isVerified,
                userContext,
            });

            if (response.status === "SIGN_IN_UP_NOT_ALLOWED") {
                return response;
            }

            let loginMethod: RecipeLevelUser | undefined = undefined;
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

                let isSignInAllowed = await AccountLinking.getInstance().isSignInAllowed({
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
                let userId = await AccountLinking.getInstance().createPrimaryUserIdOrLinkAccounts({
                    recipeUserId: loginMethod.recipeUserId,
                    checkAccountsToLinkTableAsWell: true,
                    userContext,
                });

                response.user = (await getUser(userId, userContext))!;
            }

            let session = await Session.createNewSession(
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

async function getUserInfoFromAuthCode(
    provider: TypeProvider,
    code: string,
    redirectURI: string,
    authCodeResponse: any | undefined,
    userContext: any
): Promise<{
    userInfo: UserInfo;
    authCodeResponse: any;
}> {
    // first we query the provider to get info from it.
    let accessTokenAPIResponse: any;

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

    return {
        userInfo: await providerInfo.getProfileInfo(accessTokenAPIResponse.data, userContext),
        authCodeResponse: accessTokenAPIResponse.data,
    };
}
