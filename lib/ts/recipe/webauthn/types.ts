/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
    getRelyingPartyId: TypeNormalisedInputRelyingPartyId;
    getRelyingPartyName: TypeNormalisedInputRelyingPartyName;
    getOrigin: TypeNormalisedInputGetOrigin;
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeWebauthnEmailDeliveryInput>;
    validateEmailAddress: TypeNormalisedInputValidateEmailAddress;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInputRelyingPartyId = (input: {
    tenantId: string;
    request: BaseRequest | undefined;
    userContext: UserContext;
}) => Promise<string>; // should return the domain of the origin

export type TypeNormalisedInputRelyingPartyName = (input: {
    tenantId: string;
    userContext: UserContext;
}) => Promise<string>;

export type TypeNormalisedInputGetOrigin = (input: {
    tenantId: string;
    request: BaseRequest;
    userContext: UserContext;
}) => Promise<string>; // should return the app name

export type TypeNormalisedInputValidateEmailAddress = (
    email: string,
    tenantId: string
) => Promise<string | undefined> | string | undefined;

export type TypeInput = {
    emailDelivery?: EmailDeliveryTypeInput<TypeWebauthnEmailDeliveryInput>;
    getRelyingPartyId?: TypeInputRelyingPartyId;
    getRelyingPartyName?: TypeInputRelyingPartyName;
    validateEmailAddress?: TypeInputValidateEmailAddress;
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

export type TypeInputValidateEmailAddress = (
    email: string,
    tenantId: string
) => Promise<string | undefined> | string | undefined;

// centralize error types in order to prevent missing cascading errors
// type RegisterOptionsErrorResponse = { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" } | { status: "INVALID_EMAIL_ERROR"; err: string } |  { status: "INVALID_GENERATED_OPTIONS_ERROR" };

// type SignInOptionsErrorResponse = { status: "INVALID_GENERATED_OPTIONS_ERROR" };

// type SignUpErrorResponse =
//     | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
//     | { status: "INVALID_CREDENTIALS_ERROR" }
//     | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
//     | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string };

// type SignInErrorResponse = { status: "INVALID_CREDENTIALS_ERROR" };

// type VerifyCredentialsErrorResponse = { status: "INVALID_CREDENTIALS_ERROR" };

// type GenerateRecoverAccountTokenErrorResponse = { status: "UNKNOWN_USER_ID_ERROR" };

// type ConsumeRecoverAccountTokenErrorResponse = { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" };

// type RegisterCredentialErrorResponse =
//     | { status: "INVALID_CREDENTIALS_ERROR" }
//     | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
//     // when the attestation is checked and is not valid or other cases in whcih the authenticator is not correct
//     | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string };

// type CreateNewRecipeUserErrorResponse =
//     | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
//     | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
//     | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
//     | { status: "EMAIL_ALREADY_EXISTS_ERROR" };

// type DecodeCredentialErrorResponse = { status: "INVALID_CREDENTIALS_ERROR" };

// type GetUserFromRecoverAccountTokenErrorResponse = { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" };

// type RemoveCredentialErrorResponse = { status: "CREDENTIAL_NOT_FOUND_ERROR" };

// type GetCredentialErrorResponse = { status: "CREDENTIAL_NOT_FOUND_ERROR" };

// type RemoveGeneratedOptionsErrorResponse = { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" };

// type GetGeneratedOptionsErrorResponse = { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" };

type Base64URLString = string;

export type ResidentKey = "required" | "preferred" | "discouraged";
export type UserVerification = "required" | "preferred" | "discouraged";
export type Attestation = "none" | "indirect" | "direct" | "enterprise";

export type RecipeInterface = {
    registerOptions(
        input: {
            relyingPartyId: string;
            relyingPartyName: string;
            displayName?: string;
            origin: string;
            // default to 'required' in order store the private key locally on the device and not on the server
            residentKey: ResidentKey | undefined;
            // default to 'preferred' in order to verify the user (biometrics, pin, etc) based on the device preferences
            userVerification: UserVerification | undefined;
            // default to 'none' in order to allow any authenticator and not verify attestation
            attestation: Attestation | undefined;
            // default to [-8, -7, -257] as supported algorithms. See https://www.iana.org/assignments/cose/cose.xhtml#algorithms.
            supportedAlgorithmIds: number[] | undefined;
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
        )
    ): Promise<
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              createdAt: string;
              expiresAt: string;
              // for understanding the response, see https://www.w3.org/TR/webauthn-3/#sctn-registering-a-new-credential and https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential
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
              attestation: Attestation;
              pubKeyCredParams: {
                  // we will default to [-8, -7, -257] as supported algorithms. See https://www.iana.org/assignments/cose/cose.xhtml#algorithms
                  alg: number;
                  type: "public-key";
              }[];
              authenticatorSelection: {
                  requireResidentKey: boolean;
                  residentKey: ResidentKey;
                  userVerification: UserVerification;
              };
          }
        // | RegisterOptionsErrorResponse
        | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
        | { status: "INVALID_EMAIL_ERROR"; err: string }
        | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
    >;

    signInOptions(input: {
        relyingPartyId: string;
        relyingPartyName: string;
        origin: string;
        userVerification: UserVerification | undefined; // see register options
        timeout: number | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              createdAt: string;
              expiresAt: string;
              challenge: string;
              timeout: number;
              userVerification: UserVerification;
          }
        // | SignInOptionsErrorResponse
        | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
    >;

    signUp(input: {
        webauthnGeneratedOptionsId: string;
        credential: RegistrationPayload;
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
        // | SignUpErrorResponse
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
        | { status: "INVALID_CREDENTIALS_ERROR" }
        | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
        | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
        | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
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
        credential: AuthenticationPayload;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        // | SignInErrorResponse
        | { status: "INVALID_CREDENTIALS_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;

    verifyCredentials(input: {
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        // | VerifyCredentialsErrorResponse
        | { status: "INVALID_CREDENTIALS_ERROR" }
    >;

    // this function is meant only for creating the recipe in the core and nothing else.
    // we added this even though signUp exists cause devs may override signup expecting it
    // to be called just during sign up. But we also need a version of signing up which can be
    // called during operations like creating a user during password reset flow.
    createNewRecipeUser(input: {
        webauthnGeneratedOptionsId: string;
        credential: RegistrationPayload;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        // | CreateNewRecipeUserErrorResponse
        | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
        | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
        | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
        | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
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
    }): Promise<
        | { status: "OK"; token: string }
        // | GenerateRecoverAccountTokenErrorResponse
        | { status: "UNKNOWN_USER_ID_ERROR" }
    >;

    // make sure the email maps to options email
    consumeRecoverAccountToken(input: {
        token: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        // | ConsumeRecoverAccountTokenErrorResponse
        | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
    >;

    // used internally for creating a credential during recover account flow or when adding a credential to an existing user
    // email will be taken from the options
    // no need for recoverAccountToken, as that will be used upstream
    // (in consumeRecoverAccountToken invalidating the token and in registerOptions for storing the email in the generated options)
    registerCredential(input: {
        webauthnGeneratedOptionsId: string;
        credential: RegistrationPayload;
        userContext: UserContext;
        recipeUserId: RecipeUserId;
    }): Promise<
        | {
              status: "OK";
          }
        // | RegisterCredentialErrorResponse
        | { status: "INVALID_CREDENTIALS_ERROR" }
        | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
        | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
        | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
    >;

    decodeCredential(input: {
        credential: CredentialPayload;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              credential: {
                  id: string;
                  rawId: string;
                  response: {
                      clientDataJSON: {
                          type: string;
                          challenge: string;
                          origin: string;
                          crossOrigin?: boolean;
                          tokenBinding?: {
                              id?: string;
                              status: "present" | "supported" | "not-supported";
                          };
                      };
                      attestationObject: {
                          fmt: "packed" | "tpm" | "android-key" | "android-safetynet" | "fido-u2f" | "none";
                          authData: {
                              rpIdHash: string;
                              flags: {
                                  up: boolean;
                                  uv: boolean;
                                  be: boolean;
                                  bs: boolean;
                                  at: boolean;
                                  ed: boolean;
                                  flagsInt: number;
                              };
                              counter: number;
                              aaguid?: string;
                              credentialID?: string;
                              credentialPublicKey?: string;
                              extensionsData?: unknown;
                          };
                          attStmt: {
                              sig?: Base64URLString;
                              x5c?: Base64URLString[];
                              response?: Base64URLString;
                              alg?: number;
                              ver?: string;
                              certInfo?: Base64URLString;
                              pubArea?: Base64URLString;
                              size: number;
                          };
                      };
                      transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
                      userHandle: string;
                  };
                  authenticatorAttachment: "platform" | "cross-platform";
                  clientExtensionResults: Record<string, unknown>;
                  type: string;
              };
          }
        // | DecodeCredentialErrorResponse
        | { status: "INVALID_CREDENTIALS_ERROR" }
    >;

    // used for retrieving the user details (email) from the recover account token
    // should be used in the registerOptions function when the user recovers the account and generates the credentials
    getUserFromRecoverAccountToken(input: {
        token: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | { status: "OK"; user: User; recipeUserId: RecipeUserId }
        // | GetUserFromRecoverAccountTokenErrorResponse
        | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
    >;

    // credentials CRUD
    removeCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: RecipeUserId;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        // | RemoveCredentialErrorResponse
        | { status: "CREDENTIAL_NOT_FOUND_ERROR" }
    >;

    getCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: RecipeUserId;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              id: string;
              relyingPartyId: string;
              recipeUserId: RecipeUserId;
              createdAt: number;
          }
        // | GetCredentialErrorResponse
        | { status: "CREDENTIAL_NOT_FOUND_ERROR" }
    >;

    listCredentials(input: {
        recipeUserId: RecipeUserId;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        credentials: {
            id: string;
            relyingPartyId: string;
            createdAt: number;
        }[];
    }>;

    // Generated options CRUD
    removeGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | { status: "OK" }
        // | RemoveGeneratedOptionsErrorResponse
        | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
    >;

    getGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              id: string;
              relyingPartyId: string;
              relyingPartyName: string;
              origin: string;
              email: string;
              timeout: string;
              challenge: string;
              createdAt: number;
              expiresAt: number;
          }
        // | GetGeneratedOptionsErrorResponse
        | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" }
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

// type RegisterOptionsPOSTErrorResponse =
//     | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
//     | { status: "INVALID_EMAIL_ERROR"; err: string }
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" };

// type SignInOptionsPOSTErrorResponse =
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" };

// type SignUpPOSTErrorResponse =
//     | {
//           status: "SIGN_UP_NOT_ALLOWED";
//           reason: string;
//       }
//     | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
//     | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
//     | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
//     | { status: "EMAIL_ALREADY_EXISTS_ERROR" };

// type SignInPOSTErrorResponse =
//     | { status: "INVALID_CREDENTIALS_ERROR" }
//     | {
//           status: "SIGN_IN_NOT_ALLOWED";
//           reason: string;
//       };

// type GenerateRecoverAccountTokenPOSTErrorResponse = {
//     status: "RECOVER_ACCOUNT_NOT_ALLOWED";
//     reason: string;
// };

// type RecoverAccountPOSTErrorResponse =
//     | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
//     | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
//     | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
//     | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string };

// type RegisterCredentialPOSTErrorResponse =
//     | {
//           status: "REGISTER_CREDENTIAL_NOT_ALLOWED";
//           reason: string;
//       }
//     | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
//     | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
//     | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
//     | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string };

export type APIInterface = {
    registerOptionsPOST:
        | undefined
        | ((
              input: {
                  tenantId: string;
                  options: APIOptions;
                  userContext: UserContext;
              } & ({ email: string } | { recoverAccountToken: string })
          ) => Promise<
              | {
                    status: "OK";
                    webauthnGeneratedOptionsId: string;
                    createdAt: string;
                    expiresAt: string;
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
                        residentKey: ResidentKey;
                        userVerification: UserVerification;
                    };
                }
              | GeneralErrorResponse
              //   | RegisterOptionsPOSTErrorResponse
              | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
              | { status: "INVALID_EMAIL_ERROR"; err: string }
              | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
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
                    createdAt: string;
                    expiresAt: string;
                    challenge: string;
                    timeout: number;
                    userVerification: UserVerification;
                }
              | GeneralErrorResponse
              //   | SignInOptionsPOSTErrorResponse
              | { status: "INVALID_GENERATED_OPTIONS_ERROR" }
          >);

    signUpPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
              credential: RegistrationPayload;
              tenantId: string;
              session: SessionContainerInterface | undefined;
              shouldTryLinkingWithSessionUser: boolean | undefined;
              options: APIOptions;
              userContext: UserContext;
              // should also have the email or recoverAccountToken in order to do the preauth checks
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | GeneralErrorResponse
              //   | SignUpPOSTErrorResponse
              | {
                    status: "SIGN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
              | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
              | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
              | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
              | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
          >);

    signInPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
              credential: AuthenticationPayload;
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
              //   | SignInPOSTErrorResponse
              | {
                    status: "SIGN_IN_NOT_ALLOWED";
                    reason: string;
                }
              | { status: "INVALID_CREDENTIALS_ERROR" }
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
              | GeneralErrorResponse
              //   | GenerateRecoverAccountTokenPOSTErrorResponse
              | {
                    status: "RECOVER_ACCOUNT_NOT_ALLOWED";
                    reason: string;
                }
          >);

    recoverAccountPOST:
        | undefined
        | ((input: {
              token: string;
              webauthnGeneratedOptionsId: string;
              credential: RegistrationPayload;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    email: string;
                }
              | GeneralErrorResponse
              //   | RecoverAccountPOSTErrorResponse
              | { status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR" }
              | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
              | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
              | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
              | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
          >);

    registerCredentialPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
              credential: CredentialPayload;
              tenantId: string;
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | GeneralErrorResponse
              //   | RegisterCredentialPOSTErrorResponse
              | {
                    status: "REGISTER_CREDENTIAL_NOT_ALLOWED";
                    reason: string;
                }
              | { status: "INVALID_CREDENTIALS_ERROR" } // the credential is not valid for various reasons - will discover this during implementation
              | { status: "GENERATED_OPTIONS_NOT_FOUND_ERROR" } // i.e. options not found
              | { status: "INVALID_GENERATED_OPTIONS_ERROR" } // i.e. timeout expired
              | { status: "INVALID_AUTHENTICATOR_ERROR"; reason: string }
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

export type CredentialPayloadBase = {
    id: string;
    rawId: string;
    authenticatorAttachment?: "platform" | "cross-platform";
    clientExtensionResults: Record<string, unknown>;
    type: "public-key";
};

export type AuthenticatorAssertionResponseJSON = {
    clientDataJSON: Base64URLString;
    authenticatorData: Base64URLString;
    signature: Base64URLString;
    userHandle?: Base64URLString;
};

export type AuthenticatorAttestationResponseJSON = {
    clientDataJSON: Base64URLString;
    attestationObject: Base64URLString;
    authenticatorData?: Base64URLString;
    transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
    publicKeyAlgorithm?: COSEAlgorithmIdentifier;
    publicKey?: Base64URLString;
};

export type AuthenticationPayload = CredentialPayloadBase & {
    response: AuthenticatorAssertionResponseJSON;
};

export type RegistrationPayload = CredentialPayloadBase & {
    response: AuthenticatorAttestationResponseJSON;
};

export type CredentialPayload = CredentialPayloadBase & {
    response: {
        clientDataJSON: string;
        attestationObject: string;
        transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
        userHandle: string;
    };
};
