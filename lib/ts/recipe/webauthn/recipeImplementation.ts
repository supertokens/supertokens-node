import { RecipeInterface, TypeNormalisedInput } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { LoginMethod, User } from "../../user";
import { AuthUtils } from "../../authUtils";
import * as jose from "jose";
import { isFakeEmail } from "../thirdparty/utils";

export default function getRecipeInterface(
    querier: Querier,
    getWebauthnConfig: () => TypeNormalisedInput
): RecipeInterface {
    return {
        registerOptions: async function ({
            relyingPartyId,
            relyingPartyName,
            origin,
            timeout,
            attestation = "none",
            tenantId,
            userContext,
            supportedAlgorithmIds,
            userVerification,
            residentKey,
            ...rest
        }) {
            const emailInput = "email" in rest ? rest.email : undefined;
            const recoverAccountTokenInput = "recoverAccountToken" in rest ? rest.recoverAccountToken : undefined;

            let email: string | undefined;
            if (emailInput !== undefined) {
                email = emailInput;
            } else if (recoverAccountTokenInput !== undefined) {
                // the actual validation of the token will be done during consumeRecoverAccountToken
                let decoded: jose.JWTPayload | undefined;
                try {
                    decoded = await jose.decodeJwt(recoverAccountTokenInput);
                } catch (e) {
                    console.error(e);

                    return {
                        status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR",
                    };
                }

                email = decoded?.email as string | undefined;
            }

            if (!email) {
                return {
                    status: "INVALID_EMAIL_ERROR",
                    err: "The email is missing",
                };
            }

            const err = await getWebauthnConfig().validateEmailAddress(email, tenantId);
            if (err) {
                return {
                    status: "INVALID_EMAIL_ERROR",
                    err,
                };
            }

            // set a nice default display name
            // if the user has a fake email, we use the username part of the email instead (which should be the recipe user id)
            let displayName: string;
            if (rest.displayName) {
                displayName = rest.displayName;
            } else {
                if (isFakeEmail(email)) {
                    displayName = email.split("@")[0];
                } else {
                    displayName = email;
                }
            }

            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options/register`
                ),
                {
                    email,
                    displayName,
                    relyingPartyName,
                    relyingPartyId,
                    origin,
                    timeout,
                    attestation,
                    supportedAlgorithmIds,
                    userVerification,
                    residentKey,
                },
                userContext
            );
        },

        signInOptions: async function ({ relyingPartyId, origin, timeout, tenantId, userContext, email }) {
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options/signin`
                ),
                {
                    email,
                    relyingPartyId,
                    origin,
                    timeout,
                },
                userContext
            );
        },

        signUp: async function (
            this: RecipeInterface,
            { webauthnGeneratedOptionsId, credential, tenantId, session, shouldTryLinkingWithSessionUser, userContext }
        ) {
            const response = await this.createNewRecipeUser({
                credential,
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }

            let updatedUser = response.user;

            const linkResult = await AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                tenantId,
                inputUser: response.user,
                recipeUserId: response.recipeUserId,
                session,
                shouldTryLinkingWithSessionUser,
                userContext,
            });

            if (linkResult.status != "OK") {
                return linkResult;
            }
            updatedUser = linkResult.user;

            return {
                status: "OK",
                user: updatedUser,
                recipeUserId: response.recipeUserId,
            };
        },

        signIn: async function (
            this: RecipeInterface,
            { credential, webauthnGeneratedOptionsId, tenantId, session, shouldTryLinkingWithSessionUser, userContext }
        ) {
            const response = await this.verifyCredentials({
                credential,
                webauthnGeneratedOptionsId,
                tenantId,
                userContext,
            });
            if (response.status !== "OK") {
                return response;
            }

            const loginMethod: LoginMethod = response.user.loginMethods.find(
                (lm: LoginMethod) => lm.recipeUserId.getAsString() === response.recipeUserId.getAsString()
            )!;

            if (!loginMethod.verified) {
                await AccountLinking.getInstance().verifyEmailForRecipeUserIfLinkedAccountsAreVerified({
                    user: response.user,
                    recipeUserId: response.recipeUserId,
                    userContext,
                });

                // Unlike in the sign up recipe function, we do not do account linking here
                // cause we do not want sign in to change the potentially user ID of a user
                // due to linking when this function is called by the dev in their API -
                // for example in their update password API. If we did account linking
                // then we would have to ask the dev to also change the session
                // in such API calls.
                // In the case of sign up, since we are creating a new user, it's fine
                // to link there since there is no user id change really from the dev's
                // point of view who is calling the sign up recipe function.

                // We do this so that we get the updated user (in case the above
                // function updated the verification status) and can return that
                response.user = (await getUser(response.recipeUserId!.getAsString(), userContext))!;
            }

            const linkResult = await AuthUtils.linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo({
                tenantId,
                inputUser: response.user,
                recipeUserId: response.recipeUserId,
                session,
                shouldTryLinkingWithSessionUser,
                userContext,
            });
            if (linkResult.status === "LINKING_TO_SESSION_USER_FAILED") {
                return linkResult;
            }
            response.user = linkResult.user;

            return response;
        },

        verifyCredentials: async function ({ credential, webauthnGeneratedOptionsId, tenantId, userContext }) {
            const response = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/signin`
                ),
                {
                    credential,
                    webauthnGeneratedOptionsId,
                },
                userContext
            );

            if (response.status === "OK") {
                return {
                    status: "OK",
                    user: new User(response.user),
                    recipeUserId: new RecipeUserId(response.recipeUserId),
                };
            }

            return {
                status: "INVALID_CREDENTIALS_ERROR",
            };
        },

        createNewRecipeUser: async function (input) {
            const resp = await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${input.tenantId === undefined ? DEFAULT_TENANT_ID : input.tenantId}/recipe/webauthn/signup`
                ),
                {
                    webauthnGeneratedOptionsId: input.webauthnGeneratedOptionsId,
                    credential: input.credential,
                },
                input.userContext
            );

            if (resp.status === "OK") {
                return {
                    status: "OK",
                    user: new User(resp.user),
                    recipeUserId: new RecipeUserId(resp.recipeUserId),
                };
            }

            return resp;
        },

        generateRecoverAccountToken: async function ({ userId, email, tenantId, userContext }) {
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/user/recover/token`
                ),
                {
                    userId,
                    email,
                },
                userContext
            );
        },

        consumeRecoverAccountToken: async function ({ token, tenantId, userContext }) {
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${
                        tenantId === undefined ? DEFAULT_TENANT_ID : tenantId
                    }/recipe/webauthn/user/recover/token/consume`
                ),
                {
                    token,
                },
                userContext
            );
        },

        registerCredential: async function ({ webauthnGeneratedOptionsId, credential, userContext, recipeUserId }) {
            return await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/webauthn/user/${recipeUserId}/credential/register`),
                {
                    webauthnGeneratedOptionsId,
                    credential,
                },
                userContext
            );
        },

        decodeCredential: async function ({ credential, userContext }) {
            const response = await querier.sendPostRequest(
                new NormalisedURLPath(`/recipe/webauthn/credential/decode`),
                {
                    credential,
                },
                userContext
            );

            if (response.status === "OK") {
                return response;
            }

            return {
                status: "INVALID_CREDENTIALS_ERROR",
            };
        },

        getUserFromRecoverAccountToken: async function ({ token, tenantId, userContext }) {
            return await querier.sendGetRequest(
                new NormalisedURLPath(
                    `/${
                        tenantId === undefined ? DEFAULT_TENANT_ID : tenantId
                    }/recipe/webauthn/user/recover/token/${token}`
                ),
                {},
                userContext
            );
        },

        removeCredential: async function ({ webauthnCredentialId, recipeUserId, userContext }) {
            return await querier.sendDeleteRequest(
                new NormalisedURLPath(`/recipe/webauthn/user/${recipeUserId}/credential/${webauthnCredentialId}`),
                {},
                {},
                userContext
            );
        },

        getCredential: async function ({ webauthnCredentialId, recipeUserId, userContext }) {
            return await querier.sendGetRequest(
                new NormalisedURLPath(`/recipe/webauthn/user/${recipeUserId}/credential/${webauthnCredentialId}`),
                {},
                userContext
            );
        },

        listCredentials: async function ({ recipeUserId, userContext }) {
            return await querier.sendGetRequest(
                new NormalisedURLPath(`/recipe/webauthn/user/${recipeUserId}/credential/list`),
                {},
                userContext
            );
        },

        removeGeneratedOptions: async function ({ webauthnGeneratedOptionsId, tenantId, userContext }) {
            return await querier.sendDeleteRequest(
                new NormalisedURLPath(
                    `/${
                        tenantId === undefined ? DEFAULT_TENANT_ID : tenantId
                    }/recipe/webauthn/options/${webauthnGeneratedOptionsId}`
                ),
                {},
                {},
                userContext
            );
        },

        getGeneratedOptions: async function ({ webauthnGeneratedOptionsId, tenantId, userContext }) {
            return await querier.sendGetRequest(
                new NormalisedURLPath(
                    `/${
                        tenantId === undefined ? DEFAULT_TENANT_ID : tenantId
                    }/recipe/webauthn/options/${webauthnGeneratedOptionsId}`
                ),
                {},
                userContext
            );
        },
    };
}
