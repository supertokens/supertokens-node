import { RecipeInterface, TypeNormalisedInput } from "./types";
import AccountLinking from "../accountlinking/recipe";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { getUser } from "../..";
import RecipeUserId from "../../recipeUserId";
import { DEFAULT_TENANT_ID } from "../multitenancy/constants";
import { UserContext, User as UserType } from "../../types";
import { LoginMethod, User } from "../../user";
import { AuthUtils } from "../../authUtils";

export default function getRecipeInterface(
    querier: Querier,
    getWebauthnConfig: () => TypeNormalisedInput
): RecipeInterface {
    return {
        registerOptions: async function ({
            email,
            relyingPartyId,
            relyingPartyName,
            origin,
            timeout,
            attestation = "none",
            tenantId,
            userContext,
        }: {
            email: string;
            timeout: number;
            attestation: "none" | "indirect" | "direct" | "enterprise";
            relyingPartyId: string;
            relyingPartyName: string;
            origin: string;
            tenantId: string;
            userContext: UserContext;
        }): Promise<{
            status: "OK";
            webauthnGeneratedOptionsId: string;
            rp: {
                id: string;
                name: string;
            };
            user: {
                id: string;
                name: string;
                displayName: string;
            };
            challenge: string;
            timeout: number;
            excludeCredentials: {
                id: string;
                type: string;
                transports: ("ble" | "hybrid" | "internal" | "nfc" | "usb")[];
            }[];
            attestation: "none" | "indirect" | "direct" | "enterprise";
            pubKeyCredParams: {
                alg: number;
                type: string;
            }[];
            authenticatorSelection: {
                requireResidentKey: boolean;
                residentKey: "required" | "preferred" | "discouraged";
                userVerification: "required" | "preferred" | "discouraged";
            };
        }> {
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options/register`
                ),
                {
                    email,
                    relyingPartyName,
                    relyingPartyId,
                    origin,
                    timeout,
                    attestation,
                },
                userContext
            );
        },

        signInOptions: async function ({
            relyingPartyId,
            origin,
            timeout,
            tenantId,
            userContext,
        }: {
            relyingPartyId: string;
            origin: string;
            timeout: number;
            tenantId: string;
            userContext: UserContext;
        }): Promise<{
            status: "OK";
            webauthnGeneratedOptionsId: string;
            challenge: string;
            timeout: number;
            userVerification: "required" | "preferred" | "discouraged";
        }> {
            // todo crrectly retrieve relying party id and origin
            // the input user ID can be a recipe or a primary user ID.
            return await querier.sendPostRequest(
                new NormalisedURLPath(
                    `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/options/signin`
                ),
                {
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
        ): Promise<
            | {
                  status: "OK";
                  user: UserType;
                  recipeUserId: RecipeUserId;
              }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
            | {
                  status: "LINKING_TO_SESSION_USER_FAILED";
                  reason:
                      | "EMAIL_VERIFICATION_REQUIRED"
                      | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                      | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              }
        > {
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

        createNewRecipeUser: async function (input: {
            tenantId: string;
            credential: {
                id: string;
                rawId: string;
                response: {
                    clientDataJSON: string;
                    attestationObject: string;
                    transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
                    userHandle: string;
                };
                authenticatorAttachment: "platform" | "cross-platform";
                clientExtensionResults: Record<string, unknown>;
                type: "public-key";
            };
            webauthnGeneratedOptionsId: string;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  recipeUserId: RecipeUserId;
              }
            | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        > {
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

        verifyCredentials: async function ({
            credential,
            webauthnGeneratedOptionsId,
            tenantId,
            userContext,
        }): Promise<
            | {
                  status: "OK";
                  user: User;
                  recipeUserId: RecipeUserId;
              }
            | { status: "WRONG_CREDENTIALS_ERROR" }
        > {
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
                status: "WRONG_CREDENTIALS_ERROR",
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

            if (response.status === "OK") {
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
            }

            return response;
        },

        //     generateRecoverAccountToken: async function ({
        //         userId,
        //         email,
        //         tenantId,
        //         userContext,
        //     }: {
        //         userId: string;
        //         email: string;
        //         tenantId: string;
        //         userContext: UserContext;
        //     }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }> {
        //         // the input user ID can be a recipe or a primary user ID.
        //         return await querier.sendPostRequest(
        //             new NormalisedURLPath(
        //                 `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/webauthn/user/recover/token`
        //             ),
        //             {
        //                 userId,
        //                 email,
        //             },
        //             userContext
        //         );
        //     },

        //     consumeRecoverAccountToken: async function ({
        //         token,
        //         webauthnGeneratedOptionsId,
        //         credential,
        //         tenantId,
        //         userContext,
        //     }: {
        //         token: string;
        //         webauthnGeneratedOptionsId: string;
        //         credential: {
        //             id: string;
        //             rawId: string;
        //             response: {
        //                 clientDataJSON: string;
        //                 attestationObject: string;
        //                 transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
        //                 userHandle: string;
        //             };
        //             authenticatorAttachment: "platform" | "cross-platform";
        //             clientExtensionResults: Record<string, unknown>;
        //             type: "public-key";
        //         };
        //         tenantId: string;
        //         userContext: UserContext;
        //     }): Promise<
        //         | {
        //               status: "OK";
        //               userId: string;
        //               email: string;
        //           }
        //         | { status: "RECOVER_ACCOUNT_INVALID_TOKEN_ERROR" }
        //     > {
        //         return await querier.sendPostRequest(
        //             new NormalisedURLPath(
        //                 `/${tenantId === undefined ? DEFAULT_TENANT_ID : tenantId}/recipe/paskey/user/recover/token/consume`
        //             ),
        //             {
        //                 webauthnGeneratedOptionsId,
        //                 credential,
        //                 token,
        //             },
        //             userContext
        //         );
        //     },
    };
}
