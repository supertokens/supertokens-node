// @ts-nocheck
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
export declare type TypeNormalisedInput = {
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
export declare type TypeNormalisedInputRelyingPartyId = (input: {
    tenantId: string;
    request: BaseRequest | undefined;
    userContext: UserContext;
}) => Promise<string>;
export declare type TypeNormalisedInputRelyingPartyName = (input: {
    tenantId: string;
    request: BaseRequest | undefined;
    userContext: UserContext;
}) => Promise<string>;
export declare type TypeNormalisedInputGetOrigin = (input: {
    tenantId: string;
    request: BaseRequest;
    userContext: UserContext;
}) => Promise<string>;
export declare type TypeNormalisedInputValidateEmailAddress = (
    email: string,
    tenantId: string,
    userContext: UserContext
) => Promise<string | undefined> | string | undefined;
export declare type TypeInput = {
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
export declare type TypeInputRelyingPartyId =
    | string
    | ((input: { tenantId: string; request: BaseRequest | undefined; userContext: UserContext }) => Promise<string>);
export declare type TypeInputRelyingPartyName =
    | string
    | ((input: { tenantId: string; userContext: UserContext }) => Promise<string>);
export declare type TypeInputGetOrigin = (input: {
    tenantId: string;
    request: BaseRequest;
    userContext: UserContext;
}) => Promise<string>;
export declare type TypeInputValidateEmailAddress = (
    email: string,
    tenantId: string,
    userContext: UserContext
) => Promise<string | undefined> | string | undefined;
declare type RegisterOptionsErrorResponse =
    | {
          status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
      }
    | {
          status: "INVALID_EMAIL_ERROR";
          err: string;
      }
    | {
          status: "INVALID_OPTIONS_ERROR";
      };
declare type SignInOptionsErrorResponse = {
    status: "INVALID_OPTIONS_ERROR";
};
declare type CreateNewRecipeUserErrorResponse =
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "OPTIONS_NOT_FOUND_ERROR";
      }
    | {
          status: "INVALID_OPTIONS_ERROR";
      }
    | {
          status: "INVALID_CREDENTIALS_ERROR";
      }
    | {
          status: "INVALID_AUTHENTICATOR_ERROR";
          reason: string;
      };
declare type SignUpErrorResponse =
    | CreateNewRecipeUserErrorResponse
    | {
          status: "LINKING_TO_SESSION_USER_FAILED";
          reason:
              | "EMAIL_VERIFICATION_REQUIRED"
              | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
              | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
              | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
      };
declare type VerifyCredentialsErrorResponse =
    | {
          status: "INVALID_CREDENTIALS_ERROR";
      }
    | {
          status: "INVALID_OPTIONS_ERROR";
      }
    | {
          status: "INVALID_AUTHENTICATOR_ERROR";
      }
    | {
          status: "CREDENTIAL_NOT_FOUND_ERROR";
      }
    | {
          status: "UNKNOWN_USER_ID_ERROR";
      }
    | {
          status: "OPTIONS_NOT_FOUND_ERROR";
      };
declare type SignInErrorResponse =
    | VerifyCredentialsErrorResponse
    | {
          status: "LINKING_TO_SESSION_USER_FAILED";
          reason:
              | "EMAIL_VERIFICATION_REQUIRED"
              | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
              | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
              | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
      };
declare type GenerateRecoverAccountTokenErrorResponse = {
    status: "UNKNOWN_USER_ID_ERROR";
};
declare type ConsumeRecoverAccountTokenErrorResponse = {
    status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
};
declare type RegisterCredentialErrorResponse =
    | {
          status: "INVALID_CREDENTIALS_ERROR";
      }
    | {
          status: "OPTIONS_NOT_FOUND_ERROR";
      }
    | {
          status: "INVALID_OPTIONS_ERROR";
      }
    | {
          status: "INVALID_AUTHENTICATOR_ERROR";
          reason: string;
      };
declare type GetUserFromRecoverAccountTokenErrorResponse = {
    status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
};
declare type RemoveCredentialErrorResponse = {
    status: "CREDENTIAL_NOT_FOUND_ERROR";
};
declare type GetCredentialErrorResponse = {
    status: "CREDENTIAL_NOT_FOUND_ERROR";
};
declare type RemoveGeneratedOptionsErrorResponse = {
    status: "OPTIONS_NOT_FOUND_ERROR";
};
declare type GetGeneratedOptionsErrorResponse = {
    status: "OPTIONS_NOT_FOUND_ERROR";
};
declare type UpdateUserEmailErrorResponse =
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "UNKNOWN_USER_ID_ERROR";
      };
declare type Base64URLString = string;
export declare type ResidentKey = "required" | "preferred" | "discouraged";
export declare type UserVerification = "required" | "preferred" | "discouraged";
export declare type Attestation = "none" | "indirect" | "direct" | "enterprise";
export declare type RecipeInterface = {
    registerOptions(
        input: {
            relyingPartyId: string;
            relyingPartyName: string;
            origin: string;
            residentKey: ResidentKey | undefined;
            userVerification: UserVerification | undefined;
            userPresence: boolean | undefined;
            attestation: Attestation | undefined;
            supportedAlgorithmIds: number[] | undefined;
            timeout: number | undefined;
            tenantId: string;
            userContext: UserContext;
        } & (
            | {
                  recoverAccountToken: string;
              }
            | {
                  displayName: string | undefined;
                  email: string;
              }
        )
    ): Promise<
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
              attestation: Attestation;
              pubKeyCredParams: {
                  alg: number;
                  type: "public-key";
              }[];
              authenticatorSelection: {
                  requireResidentKey: boolean;
                  residentKey: ResidentKey;
                  userVerification: UserVerification;
              };
          }
        | RegisterOptionsErrorResponse
    >;
    signInOptions(input: {
        relyingPartyId: string;
        relyingPartyName: string;
        origin: string;
        userVerification: UserVerification | undefined;
        userPresence: boolean | undefined;
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
        | SignInOptionsErrorResponse
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
        | SignUpErrorResponse
    >;
    signIn(input: {
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
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
        | SignInErrorResponse
    >;
    verifyCredentials(input: {
        webauthnGeneratedOptionsId: string;
        credential: AuthenticationPayload;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | VerifyCredentialsErrorResponse
    >;
    /**
     * This function is meant only for creating the recipe in the core and nothing else.
     * We added this even though signUp exists cause devs may override signup expecting it
     * to be called just during sign up. But we also need a version of signing up which can be
     * called during operations like creating a user during account recovery flow.
     */
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
        | CreateNewRecipeUserErrorResponse
    >;
    /**
     * We pass in the email as well to this function cause the input userId
     * may not be associated with an webauthn account. In this case, we
     * need to know which email to use to create an webauthn account later on.
     */
    generateRecoverAccountToken(input: {
        userId: string;
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              token: string;
          }
        | GenerateRecoverAccountTokenErrorResponse
    >;
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
        | ConsumeRecoverAccountTokenErrorResponse
    >;
    registerCredential(input: {
        webauthnGeneratedOptionsId: string;
        credential: RegistrationPayload;
        userContext: UserContext;
        recipeUserId: string;
    }): Promise<
        | {
              status: "OK";
          }
        | RegisterCredentialErrorResponse
    >;
    getUserFromRecoverAccountToken(input: {
        token: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | GetUserFromRecoverAccountTokenErrorResponse
    >;
    removeCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | RemoveCredentialErrorResponse
    >;
    getCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              webauthnCredentialId: string;
              relyingPartyId: string;
              recipeUserId: RecipeUserId;
              createdAt: number;
          }
        | GetCredentialErrorResponse
    >;
    listCredentials(input: {
        recipeUserId: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
        credentials: {
            webauthnCredentialId: string;
            relyingPartyId: string;
            recipeUserId: string;
            createdAt: number;
        }[];
    }>;
    removeGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | RemoveGeneratedOptionsErrorResponse
    >;
    getGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              relyingPartyId: string;
              relyingPartyName: string;
              userVerification: UserVerification;
              userPresence: boolean;
              origin: string;
              email: string;
              timeout: string;
              challenge: string;
              createdAt: number;
              expiresAt: number;
          }
        | GetGeneratedOptionsErrorResponse
    >;
    updateUserEmail(input: {
        recipeUserId: string;
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | UpdateUserEmailErrorResponse
    >;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypeWebauthnEmailDeliveryInput>;
};
declare type RegisterOptionsPOSTErrorResponse = RegisterOptionsErrorResponse;
declare type SignInOptionsPOSTErrorResponse = SignInOptionsErrorResponse;
declare type SignUpPOSTErrorResponse =
    | {
          status: "SIGN_UP_NOT_ALLOWED";
          reason: string;
      }
    | {
          status: "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          status: "INVALID_CREDENTIALS_ERROR";
      }
    | {
          status: "INVALID_AUTHENTICATOR_ERROR";
          reason: string;
      }
    | {
          status: "OPTIONS_NOT_FOUND_ERROR";
      }
    | {
          status: "INVALID_OPTIONS_ERROR";
      };
declare type SignInPOSTErrorResponse =
    | {
          status: "INVALID_CREDENTIALS_ERROR";
      }
    | {
          status: "SIGN_IN_NOT_ALLOWED";
          reason: string;
      };
declare type GenerateRecoverAccountTokenPOSTErrorResponse = {
    status: "RECOVER_ACCOUNT_NOT_ALLOWED";
    reason: string;
};
declare type RecoverAccountPOSTErrorResponse =
    | {
          status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
      }
    | {
          status: "INVALID_CREDENTIALS_ERROR";
      }
    | {
          status: "OPTIONS_NOT_FOUND_ERROR";
      }
    | {
          status: "INVALID_OPTIONS_ERROR";
      }
    | {
          status: "INVALID_AUTHENTICATOR_ERROR";
          reason: string;
      };
declare type RegisterCredentialPOSTErrorResponse =
    | {
          status: "REGISTER_CREDENTIAL_NOT_ALLOWED";
          reason: string;
      }
    | {
          status: "INVALID_CREDENTIALS_ERROR";
      }
    | {
          status: "OPTIONS_NOT_FOUND_ERROR";
      }
    | {
          status: "INVALID_OPTIONS_ERROR";
      }
    | {
          status: "INVALID_AUTHENTICATOR_ERROR";
          reason: string;
      };
export declare type APIInterface = {
    registerOptionsPOST:
        | undefined
        | ((
              input: {
                  tenantId: string;
                  options: APIOptions;
                  userContext: UserContext;
              } & (
                  | {
                        email: string;
                        displayName?: string;
                    }
                  | {
                        recoverAccountToken: string;
                    }
              )
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
                    createdAt: string;
                    expiresAt: string;
                    rpId: string;
                    challenge: string;
                    timeout: number;
                    userVerification: UserVerification;
                }
              | GeneralErrorResponse
              | SignInOptionsPOSTErrorResponse
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
              | GeneralErrorResponse
              | GenerateRecoverAccountTokenPOSTErrorResponse
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
              | RecoverAccountPOSTErrorResponse
          >);
    registerCredentialPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
              credential: RegistrationPayload;
              tenantId: string;
              session: SessionContainerInterface;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | GeneralErrorResponse
              | RegisterCredentialPOSTErrorResponse
          >);
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
export declare type TypeWebauthnRecoverAccountEmailDeliveryInput = {
    type: "RECOVER_ACCOUNT";
    user: {
        id: string;
        recipeUserId: RecipeUserId | undefined;
        email: string;
    };
    recoverAccountLink: string;
    tenantId: string;
};
export declare type TypeWebauthnEmailDeliveryInput = TypeWebauthnRecoverAccountEmailDeliveryInput;
export declare type CredentialPayloadBase = {
    id: string;
    rawId: string;
    authenticatorAttachment?: "platform" | "cross-platform";
    clientExtensionResults: Record<string, unknown>;
    type: "public-key";
};
export declare type AuthenticatorAssertionResponseJSON = {
    clientDataJSON: Base64URLString;
    authenticatorData: Base64URLString;
    signature: Base64URLString;
    userHandle?: Base64URLString;
};
export declare type AuthenticatorAttestationResponseJSON = {
    clientDataJSON: Base64URLString;
    attestationObject: Base64URLString;
    authenticatorData?: Base64URLString;
    transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
    publicKeyAlgorithm?: COSEAlgorithmIdentifier;
    publicKey?: Base64URLString;
};
export declare type AuthenticationPayload = CredentialPayloadBase & {
    response: AuthenticatorAssertionResponseJSON;
};
export declare type RegistrationPayload = CredentialPayloadBase & {
    response: AuthenticatorAttestationResponseJSON;
};
export declare type CredentialPayload = CredentialPayloadBase & {
    response: {
        clientDataJSON: string;
        attestationObject: string;
        transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
        userHandle: string;
    };
};
export {};
