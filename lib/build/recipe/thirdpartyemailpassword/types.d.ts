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
    TypeFormField,
    TypeInputFormField,
    TypeInputResetPasswordUsingTokenFeature,
    APIOptions as EmailPasswordAPIOptionsOriginal,
    TypeEmailPasswordEmailDeliveryInput,
    RecipeInterface as EPRecipeInterface,
} from "../emailpassword/types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import { GeneralErrorResponse } from "../../types";
export declare type User = {
    id: string;
    timeJoined: number;
    email: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
    tenantIds: string[];
};
export declare type TypeContextEmailPasswordSignUp = {
    loginType: "emailpassword";
    formFields: TypeFormField[];
};
export declare type TypeContextEmailPasswordSignIn = {
    loginType: "emailpassword";
};
export declare type TypeContextThirdParty = {
    loginType: "thirdparty";
    thirdPartyAuthCodeResponse: any;
};
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
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
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
        emailPasswordRecipeImpl: EPRecipeInterface,
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getUserById(input: { userId: string; userContext: any }): Promise<User | undefined>;
    getUsersByEmail(input: { email: string; tenantId: string; userContext: any }): Promise<User[]>;
    getUserByThirdPartyInfo(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        tenantId: string;
        userContext: any;
    }): Promise<User | undefined>;
    thirdPartyGetProvider(input: {
        thirdPartyId: string;
        clientType?: string;
        tenantId: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        provider: TypeProvider;
        thirdPartyEnabled: boolean;
    }>;
    thirdPartySignInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
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
        userContext: any;
    }): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
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
    }>;
    thirdPartyManuallyCreateOrUpdateUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        tenantId: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    emailPasswordSignUp(input: {
        email: string;
        password: string;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    emailPasswordSignIn(input: {
        email: string;
        password: string;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    createResetPasswordToken(input: {
        userId: string;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    resetPasswordUsingToken(input: {
        token: string;
        newPassword: string;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              /**
               * The id of the user whose password was reset.
               * Defined for Core versions 3.9 or later
               */
              userId?: string;
          }
        | {
              status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
    >;
    updateEmailOrPassword(input: {
        userId: string;
        email?: string;
        password?: string;
        userContext: any;
        applyPasswordPolicy?: boolean;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
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
              userContext: any;
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
              userContext: any;
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
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
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
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    userId?: string;
                }
              | {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
                }
              | GeneralErrorResponse
          >);
    thirdPartySignInUpPOST:
        | undefined
        | ((
              input: {
                  provider: TypeProvider;
                  tenantId: string;
                  options: ThirdPartyAPIOptions;
                  userContext: any;
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
                    createdNewUser: boolean;
                    user: User;
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
              options: EmailPasswordAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
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
              options: EmailPasswordAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
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
              userContext: any;
          }) => Promise<void>);
};
export declare type TypeThirdPartyEmailPasswordEmailDeliveryInput = TypeEmailPasswordEmailDeliveryInput;
export declare type ThirdPartyProviderInput = ProviderInput;
export declare type ThirdPartyProviderConfig = ProviderConfig;
export declare type ThirdPartyProviderClientConfig = ProviderClientConfig;
export declare type ThirdPartyProviderConfigForClientType = ProviderConfigForClientType;
