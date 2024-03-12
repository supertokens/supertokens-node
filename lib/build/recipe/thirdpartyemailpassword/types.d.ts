// @ts-nocheck
import {
    TypeProvider,
    APIOptions as ThirdPartyAPIOptionsOriginal,
    ProviderInput,
    ProviderClientConfig,
    ProviderConfigForClientType,
    ProviderConfig,
} from "../thirdparty/types";
import {
    NormalisedFormField,
    TypeInputFormField,
    APIOptions as EmailPasswordAPIOptionsOriginal,
    TypeEmailPasswordEmailDeliveryInput,
} from "../emailpassword/types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import { GeneralErrorResponse, User as GlobalUser, User, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};
export declare type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};
export declare type TypeInput = {
    signUpFeature?: TypeInputSignUp;
    providers?: ProviderInput[];
    emailDelivery?: EmailDeliveryTypeInput<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    providers: ProviderInput[];
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    thirdPartyGetProvider(input: {
        thirdPartyId: string;
        clientType?: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<TypeProvider | undefined>;
    thirdPartySignInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        oAuthTokens: {
            [key: string]: any;
        };
        rawUserInfoFromProvider: {
            fromIdTokenPayload?: {
                [key: string]: any;
            };
            fromUserInfoAPI?: {
                [key: string]: any;
            };
        };
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
              recipeUserId: RecipeUserId;
              oAuthTokens: {
                  [key: string]: any;
              };
              rawUserInfoFromProvider: {
                  fromIdTokenPayload?: {
                      [key: string]: any;
                  };
                  fromUserInfoAPI?: {
                      [key: string]: any;
                  };
              };
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
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
    thirdPartyManuallyCreateOrUpdateUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: GlobalUser;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "SIGN_IN_UP_NOT_ALLOWED";
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
    emailPasswordSignUp(input: {
        email: string;
        password: string;
        tenantId: string;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: GlobalUser;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
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
    createNewEmailPasswordRecipeUser(input: {
        email: string;
        password: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: GlobalUser;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    emailPasswordSignIn(input: {
        email: string;
        password: string;
        tenantId: string;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: GlobalUser;
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
    emailPasswordVerifyCredentials(input: {
        email: string;
        password: string;
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
    createResetPasswordToken(input: {
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
    consumePasswordResetToken(input: {
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
              status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
    >;
    updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId;
        email?: string;
        password?: string;
        userContext: UserContext;
        applyPasswordPolicy?: boolean;
        tenantIdForPasswordPolicy: string;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "PASSWORD_POLICY_VIOLATED_ERROR";
              failureReason: string;
          }
    >;
};
export declare type EmailPasswordAPIOptions = EmailPasswordAPIOptionsOriginal;
export declare type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export declare type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              redirectURIOnProviderDashboard: string;
              tenantId: string;
              options: ThirdPartyAPIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    urlWithQueryParams: string;
                    pkceCodeVerifier?: string;
                }
              | GeneralErrorResponse
          >);
    emailPasswordEmailExistsGET:
        | undefined
        | ((input: {
              email: string;
              tenantId: string;
              options: EmailPasswordAPIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
    generatePasswordResetTokenPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              tenantId: string;
              options: EmailPasswordAPIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | {
                    status: "PASSWORD_RESET_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);
    passwordResetPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              token: string;
              tenantId: string;
              options: EmailPasswordAPIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    email: string;
                    user: GlobalUser;
                }
              | {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
                }
              | {
                    status: "PASSWORD_POLICY_VIOLATED_ERROR";
                    failureReason: string;
                }
              | GeneralErrorResponse
          >);
    thirdPartySignInUpPOST:
        | undefined
        | ((
              input: {
                  provider: TypeProvider;
                  tenantId: string;
                  session: SessionContainerInterface | undefined;
                  options: ThirdPartyAPIOptions;
                  userContext: UserContext;
              } & (
                  | {
                        redirectURIInfo: {
                            redirectURIOnProviderDashboard: string;
                            redirectURIQueryParams: any;
                            pkceCodeVerifier?: string;
                        };
                    }
                  | {
                        oAuthTokens: {
                            [key: string]: any;
                        };
                    }
              )
          ) => Promise<
              | {
                    status: "OK";
                    createdNewRecipeUser: boolean;
                    user: GlobalUser;
                    session: SessionContainerInterface;
                    oAuthTokens: {
                        [key: string]: any;
                    };
                    rawUserInfoFromProvider: {
                        fromIdTokenPayload?: {
                            [key: string]: any;
                        };
                        fromUserInfoAPI?: {
                            [key: string]: any;
                        };
                    };
                }
              | {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER";
                }
              | {
                    status: "SIGN_IN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);
    emailPasswordSignInPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              tenantId: string;
              session: SessionContainerInterface | undefined;
              options: EmailPasswordAPIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: GlobalUser;
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
    emailPasswordSignUpPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              tenantId: string;
              session: SessionContainerInterface | undefined;
              options: EmailPasswordAPIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: GlobalUser;
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
    appleRedirectHandlerPOST:
        | undefined
        | ((input: {
              formPostInfoFromProvider: any;
              options: ThirdPartyAPIOptions;
              userContext: UserContext;
          }) => Promise<void>);
};
export declare type TypeThirdPartyEmailPasswordEmailDeliveryInput = TypeEmailPasswordEmailDeliveryInput;
export declare type ThirdPartyProviderInput = ProviderInput;
export declare type ThirdPartyProviderConfig = ProviderConfig;
export declare type ThirdPartyProviderClientConfig = ProviderClientConfig;
export declare type ThirdPartyProviderConfigForClientType = ProviderConfigForClientType;
