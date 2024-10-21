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
    relyingPartyId: TypeNormalisedInputRelyingPartyId;
    relyingPartyName: TypeNormalisedInputRelyingPartyName;
    getOrigin: TypeNormalisedInputGetOrigin;
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeWebauthnEmailDeliveryInput>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInputRelyingPartyId = (input: {
    request: BaseRequest | undefined;
    userContext: UserContext;
}) => string; // should return the domain of the origin

export type TypeNormalisedInputRelyingPartyName = (input: {
    tenantId: string;
    userContext: UserContext;
}) => Promise<string>; // should return the app name

export type TypeNormalisedInputGetOrigin = (input: {
    tenantId: string;
    request: BaseRequest;
    userContext: UserContext;
}) => Promise<string>; // should return the app name

export type TypeInput = {
    emailDelivery?: EmailDeliveryTypeInput<TypeWebauthnEmailDeliveryInput>;
    relyingPartyId?: TypeInputRelyingPartyId;
    relyingPartyName?: TypeInputRelyingPartyName;
    getOrigin?: TypeInputGetOrigin;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeInputRelyingPartyId =
    | string
    | ((input: { tenantId: string; request: BaseRequest | undefined; userContext: UserContext }) => Promise<string>);

export type TypeInputRelyingPartyName =
    | string
    | ((input: { tenantId: string; userContext: UserContext }) => Promise<string>);

export type TypeInputGetOrigin = (input: {
    tenantId: string;
    request: BaseRequest;
    userContext: UserContext;
}) => Promise<string>;

// centralize error types in order to prevent missing cascading errors
type RegisterCredentialErrorResponse =
    | { status: "WRONG_CREDENTIALS_ERROR" }
    // when the attestation is checked and is not valid or other cases in whcih the authenticator is not correct
    | { status: "INVALID_AUTHENTICATOR_ERROR" };

type VerifyCredentialsErrorResponse =
    | { status: "WRONG_CREDENTIALS_ERROR" }
    // when the attestation is checked and is not valid or other cases in which the authenticator is not correct
    | { status: "INVALID_AUTHENTICATOR_ERROR" };

type CreateNewRecipeUserErrorResponse = RegisterCredentialErrorResponse | { status: "EMAIL_ALREADY_EXISTS_ERROR" };

type GetUserFromRecoverAccountTokenErrorResponse = { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" };

type RegisterOptionsErrorResponse = GetUserFromRecoverAccountTokenErrorResponse | { status: "EMAIL_MISSING_ERROR" };

type SignUpErrorResponse = CreateNewRecipeUserErrorResponse;

type SignInErrorResponse = VerifyCredentialsErrorResponse;

type GenerateRecoverAccountTokenErrorResponse = { status: "UNKNOWN_USER_ID_ERROR" } | { status: "UNKNOWN_EMAIL_ERROR" };

type ConsumeRecoverAccountTokenErrorResponse =
    | RegisterCredentialErrorResponse
    | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" };

type AddCredentialErrorResponse = RegisterCredentialErrorResponse;

type RemoveCredentialErrorResponse = { status: "CREDENTIAL_NOT_FOUND_ERROR" };

export type RecipeInterface = {
    // should have a way to access the user email: passed as a param, through session, or using recoverAccountToken
    // it should have at least one of those 3 options
    registerOptions(
        input: {
            relyingPartyId: string;
            relyingPartyName: string;
            origin: string;
            requireResidentKey: boolean | undefined; // should default to false in order to allow multiple authenticators to be used; see https://auth0.com/blog/a-look-at-webauthn-resident-credentials/
            // default to 'required' in order store the private key locally on the device and not on the server
            residentKey: "required" | "preferred" | "discouraged" | undefined;
            // default to 'preferred' in order to verify the user (biometrics, pin, etc) based on the device preferences
            userVerification: "required" | "preferred" | "discouraged" | undefined;
            // default to 'none' in order to allow any authenticator and not verify attestation
            attestation: "none" | "indirect" | "direct" | "enterprise" | undefined;
            // default to 5 seconds
            timeout: number | undefined;
            tenantId: string;
            userContext: UserContext;
        } & (
            | {
                  recoverAccountToken: string;
              }
            | {
                  email: string;
              }
            | {
                  session: SessionContainerInterface;
              }
        )
    ): Promise<
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              rp: {
                  id: string;
                  name: string;
              };
              user: {
                  id: string;
                  name: string; // user email
                  displayName: string; //user email
              };
              challenge: string;
              timeout: number;
              excludeCredentials: {
                  id: string;
                  type: "public-key";
                  transports: ("ble" | "hybrid" | "internal" | "nfc" | "usb")[];
              }[];
              attestation: "none" | "indirect" | "direct" | "enterprise";
              pubKeyCredParams: {
                  // we will default to [-8, -7, -257] as supported algorithms. See https://www.iana.org/assignments/cose/cose.xhtml#algorithms
                  alg: number;
                  type: "public-key";
              }[];
              authenticatorSelection: {
                  requireResidentKey: boolean;
                  residentKey: "required" | "preferred" | "discouraged";
                  userVerification: "required" | "preferred" | "discouraged";
              };
          }
        | RegisterOptionsErrorResponse
    >;

    signInOptions(input: {
        relyingPartyId: string;
        origin: string;
        userVerification: "required" | "preferred" | "discouraged" | undefined; // see register options
        timeout: number | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        webauthnGeneratedOptionsId: string;
        challenge: string;
        timeout: number;
        userVerification: "required" | "preferred" | "discouraged";
    }>;

    signUp(input: {
        webauthnGeneratedOptionsId: string;
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
        | SignUpErrorResponse
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
        webauthnGeneratedOptionsId: string;
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
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        | SignInErrorResponse
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
     * may not be associated with an webauthn account. In this case, we
     * need to know which email to use to create an webauthn account later on.
     */
    generateRecoverAccountToken(input: {
        userId: string; // the id can be either recipeUserId or primaryUserId
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{ status: "OK"; token: string } | GenerateRecoverAccountTokenErrorResponse>;

    // make sure the email maps to options email
    consumeRecoverAccountToken(input: {
        token: string;
        webauthnGeneratedOptionsId: string;
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
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | ConsumeRecoverAccountTokenErrorResponse
    >;

    // used internally for creating a credential during account recovery flow or when adding a credential to an existing user
    // email will be taken from the options
    // no need for recoverAccountToken, as that will be used upstream
    // (in consumeRecoverAccountToken invalidating the token and in registerOptions for storing the email in the generated options)
    registerCredential(input: {
        webauthnGeneratedOptionsId: string;
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
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | RegisterCredentialErrorResponse
    >;

    // this function is meant only for creating the recipe in the core and nothing else.
    // we added this even though signUp exists cause devs may override signup expecting it
    // to be called just during sign up. But we also need a version of signing up which can be
    // called during operations like creating a user during password reset flow.
    createNewRecipeUser(input: {
        webauthnGeneratedOptionsId: string;
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
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | CreateNewRecipeUserErrorResponse
    >;

    verifyCredentials(input: {
        webauthnGeneratedOptionsId: string;
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
        tenantId: string;
        userContext: UserContext;
    }): Promise<{ status: "OK"; user: User; recipeUserId: RecipeUserId } | VerifyCredentialsErrorResponse>;

    // used for retrieving the user details (email) from the recover account token
    // should be used in the registerOptions function when the user recovers the account and generates the credentials
    getUserFromRecoverAccountToken(input: {
        token: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{ status: "OK"; user: User; recipeUserId: RecipeUserId } | GetUserFromRecoverAccountTokenErrorResponse>;

    // credentials CRUD

    // this will call registerCredential internally
    addCredential(input: {
        webauthnGeneratedOptionsId: string;
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
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | AddCredentialErrorResponse
    >;

    // credentials CRUD
    removeCredential(input: {
        webauthnCredentialId: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | RemoveCredentialErrorResponse
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
    emailDelivery: EmailDeliveryIngredient<TypeWebauthnEmailDeliveryInput>;
};

type RegisterOptionsPOSTErrorResponse =
    | RegisterOptionsErrorResponse
    | { status: "REGISTER_OPTIONS_NOT_ALLOWED"; reason: string };

type SignInOptionsPOSTErrorResponse = { status: "SIGN_IN_OPTIONS_NOT_ALLOWED"; reason: string };

type SignUpPOSTErrorResponse =
    | {
          status: "SIGN_UP_NOT_ALLOWED";
          reason: string;
      }
    | SignUpErrorResponse;

type SignInPOSTErrorResponse =
    | {
          status: "SIGN_IN_NOT_ALLOWED";
          reason: string;
      }
    | SignInErrorResponse;

type GenerateRecoverAccountTokenPOSTErrorResponse = {
    status: "ACCOUNT_RECOVERY_NOT_ALLOWED";
    reason: string;
};

type RecoverAccountPOSTErrorResponse =
    | {
          status: "ACCOUNT_RECOVERY_NOT_ALLOWED";
          reason: string;
      }
    | ConsumeRecoverAccountTokenErrorResponse;

type AddCredentialPOSTErrorResponse =
    | {
          status: "ADD_CREDENTIAL_NOT_ALLOWED";
          reason: string;
      }
    | AddCredentialErrorResponse;

type RemoveCredentialPOSTErrorResponse =
    | {
          status: "REMOVE_CREDENTIAL_NOT_ALLOWED";
          reason: string;
      }
    | RemoveCredentialErrorResponse;
export type APIInterface = {
    registerOptionsPOST:
        | undefined
        | ((
              input: {
                  tenantId: string;
                  options: APIOptions;
                  userContext: UserContext;
              } & ({ email: string } | { recoverAccountToken: string } | { session: SessionContainerInterface })
          ) => Promise<
              | {
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
                        type: "public-key";
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
              | RegisterOptionsPOSTErrorResponse
          >);

    signInOptionsPOST:
        | undefined
        | ((input: {
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    webauthnGeneratedOptionsId: string;
                    challenge: string;
                    timeout: number;
                    userVerification: "required" | "preferred" | "discouraged";
                }
              | GeneralErrorResponse
              | SignInOptionsPOSTErrorResponse
          >);

    signUpPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
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
              | GeneralErrorResponse
              | SignUpPOSTErrorResponse
          >);

    signInPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
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
              | GeneralErrorResponse
              | SignInPOSTErrorResponse
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
              | GenerateRecoverAccountTokenPOSTErrorResponse
              | GeneralErrorResponse
          >);

    recoverAccountPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
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
              | RecoverAccountPOSTErrorResponse
              | GeneralErrorResponse
          >);

    // used for checking if the email already exists before generating the credential
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

    //credentials CRUD
    addCredentialPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
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
              tenantId: string;
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | AddCredentialPOSTErrorResponse
              | GeneralErrorResponse
          >);

    removeCredentialPOST:
        | undefined
        | ((input: {
              webauthnCredentialId: string;
              tenantId: string;
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | RemoveCredentialPOSTErrorResponse
              | GeneralErrorResponse
          >);
};

export type TypeWebauthnRecoverAccountEmailDeliveryInput = {
    type: "RECOVER_ACCOUNT";
    user: {
        id: string;
        recipeUserId: RecipeUserId | undefined;
        email: string;
    };
    recoverAccountLink: string;
    tenantId: string;
};

export type TypeWebauthnEmailDeliveryInput = TypeWebauthnRecoverAccountEmailDeliveryInput;
