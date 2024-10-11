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

import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo, User, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type TypeNormalisedInput = {
    validateEmail: (value: any, tenantId: string, userContext: UserContext) => Promise<string | undefined>;
    relyingPartyId: (input: { request: BaseRequest | undefined; userContext: UserContext }) => string; // should return the domain of the origin
    relyingPartyName: (input: { request: BaseRequest | undefined; userContext: UserContext }) => string; // should return the app name
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypePasskeyEmailDeliveryInput>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeInput = {
    emailDelivery?: EmailDeliveryTypeInput<TypePasskeyEmailDeliveryInput>;
    validateEmail?: (value: any, tenantId: string, userContext: UserContext) => Promise<string | undefined>;
    relyingPartyId?: string | ((input: { request: BaseRequest | undefined; userContext: UserContext }) => string);
    relyingPartyName?: string | ((input: { request: BaseRequest | undefined; userContext: UserContext }) => string);
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    registerPasskeyOptions(input: {
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        passkeyGeneratedOptionsId: string;
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
    }>;

    signInPasskeyOptions(input: {
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        passkeyGeneratedOptionsId: string;
        challenge: string;
        timeout: number;
        userVerification: "required" | "preferred" | "discouraged";
    }>;

    signUp(input: {
        email: string | undefined;
        passkeyGeneratedOptionsId: string;
        passkey: {
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
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
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
    >;

    signIn(input: {
        passkeyGeneratedOptionsId: string;
        passkey: {
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
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        | { status: "WRONG_CREDENTIALS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;

    /**
     * We pass in the email as well to this function cause the input userId
     * may not be associated with an passkey account. In this case, we
     * need to know which email to use to create an passkey account later on.
     */
    generateRecoverAccountToken(input: {
        userId: string; // the id can be either recipeUserId or primaryUserId
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }>;

    consumeRecoverAccountToken(input: {
        token: string;
        passkey: {
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
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | { status: "RECOVER_ACCOUNT_INVALID_TOKEN_ERROR" }
    >;

    // this function is meant only for creating the recipe in the core and nothing else.
    // we added this even though signUp exists cause devs may override signup expecting it
    // to be called just during sign up. But we also need a version of signing up which can be
    // called during operations like creating a user during password reset flow.
    createNewRecipeUser(input: {
        email: string;
        passkeyGeneratedOptionsId: string;
        passkey: {
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
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
    >;
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypePasskeyEmailDeliveryInput>;
};

export type APIInterface = {
    registerPasskeyOptionsPOST:
        | undefined
        | ((input: {
              email: string | undefined;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    passkeyGeneratedOptionsId: string;
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
                }
              | GeneralErrorResponse
          >);

    signInPasskeyOptionsPOST:
        | undefined
        | ((input: {
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    passkeyGeneratedOptionsId: string;
                    challenge: string;
                    timeout: number;
                    userVerification: "required" | "preferred" | "discouraged";
                }
              | GeneralErrorResponse
          >);

    signUpPOST:
        | undefined
        | ((input: {
              email: string;
              passkeyGeneratedOptionsId: string;
              passkey: {
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
              tenantId: string;
              session: SessionContainerInterface | undefined;
              shouldTryLinkingWithSessionUser: boolean | undefined;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "SIGN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | GeneralErrorResponse
          >);

    signInPOST:
        | undefined
        | ((input: {
              passkeyGeneratedOptionsId: string;
              passkey: {
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
              tenantId: string;
              session: SessionContainerInterface | undefined;
              shouldTryLinkingWithSessionUser: boolean | undefined;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "SIGN_IN_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
              | GeneralErrorResponse
          >);

    generateRecoverAccountTokenPOST:
        | undefined
        | ((input: {
              email: string;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | {
                    status: "ACCOUNT_RECOVERY_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);

    recoverAccountPOST:
        | undefined
        | ((input: {
              passkey: {
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
              token: string;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    email: string;
                    user: User;
                }
              | {
                    status: "RECOVER_ACCOUNT_TOKEN_INVALID_TOKEN_ERROR";
                }
              | GeneralErrorResponse
          >);

    // used for checking if the email already exists before generating the passkey
    emailExistsGET:
        | undefined
        | ((input: {
              email: string;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
};

export type TypePasskeyRecoverAccountEmailDeliveryInput = {
    type: "RECOVER_ACCOUNT";
    user: {
        id: string;
        recipeUserId: RecipeUserId | undefined;
        email: string;
    };
    recoverAccountLink: string;
    tenantId: string;
};

export type TypePasskeyEmailDeliveryInput = TypePasskeyRecoverAccountEmailDeliveryInput;
