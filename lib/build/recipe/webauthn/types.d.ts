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
    relyingPartyId: TypeNormalisedInputRelyingPartyId;
    relyingPartyName: TypeNormalisedInputRelyingPartyName;
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
    userContext: UserContext;
}) => Promise<string>;
export declare type TypeNormalisedInputGetOrigin = (input: {
    tenantId: string;
    request: BaseRequest;
    userContext: UserContext;
}) => Promise<string>;
export declare type TypeNormalisedInputValidateEmailAddress = (
    email: string,
    tenantId: string
) => Promise<string | undefined> | string | undefined;
export declare type TypeInput = {
    emailDelivery?: EmailDeliveryTypeInput<TypeWebauthnEmailDeliveryInput>;
    relyingPartyId?: TypeInputRelyingPartyId;
    relyingPartyName?: TypeInputRelyingPartyName;
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
    tenantId: string
) => Promise<string | undefined> | string | undefined;
declare type Base64URLString = string;
export declare type RecipeInterface = {
    registerOptions(
        input: {
            relyingPartyId: string;
            relyingPartyName: string;
            origin: string;
            requireResidentKey: boolean | undefined;
            residentKey: "required" | "preferred" | "discouraged" | undefined;
            userVerification: "required" | "preferred" | "discouraged" | undefined;
            attestation: "none" | "indirect" | "direct" | "enterprise" | undefined;
            supportedAlgorithmIds: number[] | undefined;
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
                  type: "public-key";
              }[];
              authenticatorSelection: {
                  requireResidentKey: boolean;
                  residentKey: "required" | "preferred" | "discouraged";
                  userVerification: "required" | "preferred" | "discouraged";
              };
          }
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
        | {
              status: "INVALID_EMAIL_ERROR";
              err: string;
          }
    >;
    signInOptions(input: {
        email?: string;
        relyingPartyId: string;
        origin: string;
        userVerification: "required" | "preferred" | "discouraged" | undefined;
        timeout: number | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              webauthnGeneratedOptionsId: string;
              challenge: string;
              timeout: number;
              userVerification: "required" | "preferred" | "discouraged";
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    signUp(input: {
        webauthnGeneratedOptionsId: string;
        credential: CredentialPayload;
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
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
        | {
              status: "INVALID_AUTHENTICATOR_ERROR";
              reason: string;
          }
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
        credential: CredentialPayload;
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
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
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
        credential: CredentialPayload;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    createNewRecipeUser(input: {
        webauthnGeneratedOptionsId: string;
        credential: CredentialPayload;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
        | {
              status: "INVALID_AUTHENTICATOR_ERROR";
              reason: string;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
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
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
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
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
    >;
    registerCredential(input: {
        webauthnGeneratedOptionsId: string;
        credential: CredentialPayload;
        userContext: UserContext;
        recipeUserId: RecipeUserId;
    }): Promise<
        | {
              status: "OK";
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
        | {
              status: "INVALID_AUTHENTICATOR_ERROR";
              reason: string;
          }
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
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
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
        | {
              status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
          }
    >;
    removeCredential(input: {
        webauthnCredentialId: string;
        recipeUserId: RecipeUserId;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | {
              status: "CREDENTIAL_NOT_FOUND_ERROR";
          }
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
        | {
              status: "CREDENTIAL_NOT_FOUND_ERROR";
          }
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
    removeGeneratedOptions(input: {
        webauthnGeneratedOptionsId: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
          }
        | {
              status: "GENERATED_OPTIONS_NOT_FOUND_ERROR";
          }
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
              origin: string;
              email: string;
              timeout: string;
              challenge: string;
          }
        | {
              status: "GENERATED_OPTIONS_NOT_FOUND_ERROR";
          }
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
                    }
                  | {
                        recoverAccountToken: string;
                    }
              )
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
              | {
                    status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
                }
              | {
                    status: "INVALID_EMAIL_ERROR";
                    err: string;
                }
          >);
    signInOptionsPOST:
        | undefined
        | ((input: {
              email?: string;
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
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
          >);
    signUpPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
              credential: CredentialPayload;
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
              | {
                    status: "SIGN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
              | {
                    status: "INVALID_AUTHENTICATOR_ERROR";
                    reason: string;
                }
          >);
    signInPOST:
        | undefined
        | ((input: {
              webauthnGeneratedOptionsId: string;
              credential: CredentialPayload;
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
              | {
                    status: "SIGN_IN_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
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
              credential: CredentialPayload;
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
              | {
                    status: "RECOVER_ACCOUNT_TOKEN_INVALID_ERROR";
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
              | {
                    status: "INVALID_AUTHENTICATOR_ERROR";
                    reason: string;
                }
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
export declare type CredentialPayload = {
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
export {};
