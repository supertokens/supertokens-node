// @ts-nocheck
import {
    TypeProvider,
    APIOptions as ThirdPartyAPIOptionsOriginal,
    ProviderInput,
    ProviderConfig,
    ProviderClientConfig,
    ProviderConfigForClientType,
} from "../thirdparty/types";
import {
    DeviceType as DeviceTypeOriginal,
    APIOptions as PasswordlessAPIOptionsOriginal,
    TypePasswordlessEmailDeliveryInput,
    TypePasswordlessSmsDeliveryInput,
} from "../passwordless/types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import {
    TypeInput as SmsDeliveryTypeInput,
    TypeInputWithService as SmsDeliveryTypeInputWithService,
} from "../../ingredients/smsdelivery/types";
import { GeneralErrorResponse, User } from "../../types";
import RecipeUserId from "../../recipeUserId";
export declare type DeviceType = DeviceTypeOriginal;
export declare type TypeInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress?: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
          validatePhoneNumber?: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
) & {
    /**
     * Unlike passwordless recipe, emailDelivery config is outside here because regardless
     * of `contactMethod` value, the config is required for email verification recipe
     */
    emailDelivery?: EmailDeliveryTypeInput<TypeThirdPartyPasswordlessEmailDeliveryInput>;
    smsDelivery?: SmsDeliveryTypeInput<TypePasswordlessSmsDeliveryInput>;
    providers?: ProviderInput[];
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
    getCustomUserInputCode?: (tenantId: string, userContext: any) => Promise<string> | string;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
      }
    | {
          contactMethod: "EMAIL_OR_PHONE";
          validateEmailAddress?: (email: string, tenantId: string) => Promise<string | undefined> | string | undefined;
          validatePhoneNumber?: (
              phoneNumber: string,
              tenantId: string
          ) => Promise<string | undefined> | string | undefined;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
    getCustomUserInputCode?: (tenantId: string, userContext: any) => Promise<string> | string;
    providers: ProviderInput[];
    getEmailDeliveryConfig: (
        recipeImpl: RecipeInterface,
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeThirdPartyPasswordlessEmailDeliveryInput>;
    getSmsDeliveryConfig: () => SmsDeliveryTypeInputWithService<TypeThirdPartyPasswordlessSmsDeliveryInput>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
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
        tenantId: string;
        userContext: any;
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
    >;
    thirdPartyManuallyCreateOrUpdateUser(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
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
    >;
    thirdPartyGetProvider(input: {
        thirdPartyId: string;
        clientType?: string;
        tenantId: string;
        userContext: any;
    }): Promise<TypeProvider | undefined>;
    createCode: (
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & {
            userInputCode?: string;
            tenantId: string;
            userContext: any;
        }
    ) => Promise<{
        status: "OK";
        preAuthSessionId: string;
        codeId: string;
        deviceId: string;
        userInputCode: string;
        linkCode: string;
        codeLifetime: number;
        timeCreated: number;
    }>;
    createNewCodeForDevice: (input: {
        deviceId: string;
        userInputCode?: string;
        tenantId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              preAuthSessionId: string;
              codeId: string;
              deviceId: string;
              userInputCode: string;
              linkCode: string;
              codeLifetime: number;
              timeCreated: number;
          }
        | {
              status: "RESTART_FLOW_ERROR" | "USER_INPUT_CODE_ALREADY_USED_ERROR";
          }
    >;
    consumeCode: (
        input:
            | {
                  userInputCode: string;
                  deviceId: string;
                  preAuthSessionId: string;
                  tenantId: string;
                  userContext: any;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
                  tenantId: string;
                  userContext: any;
              }
    ) => Promise<
        | {
              status: "OK";
              createdNewRecipeUser: boolean;
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | {
              status: "RESTART_FLOW_ERROR";
          }
    >;
    updatePasswordlessUser: (input: {
        recipeUserId: RecipeUserId;
        email?: string | null;
        phoneNumber?: string | null;
        userContext: any;
    }) => Promise<
        | {
              status:
                  | "OK"
                  | "UNKNOWN_USER_ID_ERROR"
                  | "EMAIL_ALREADY_EXISTS_ERROR"
                  | "PHONE_NUMBER_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR" | "PHONE_NUMBER_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
    >;
    revokeAllCodes: (
        input:
            | {
                  email: string;
                  tenantId: string;
                  userContext: any;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext: any;
              }
    ) => Promise<{
        status: "OK";
    }>;
    revokeCode: (input: {
        codeId: string;
        tenantId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
    }>;
    listCodesByEmail: (input: { email: string; tenantId: string; userContext: any }) => Promise<DeviceType[]>;
    listCodesByPhoneNumber: (input: {
        phoneNumber: string;
        tenantId: string;
        userContext: any;
    }) => Promise<DeviceType[]>;
    listCodesByDeviceId: (input: {
        deviceId: string;
        tenantId: string;
        userContext: any;
    }) => Promise<DeviceType | undefined>;
    listCodesByPreAuthSessionId: (input: {
        preAuthSessionId: string;
        tenantId: string;
        userContext: any;
    }) => Promise<DeviceType | undefined>;
};
export declare type PasswordlessAPIOptions = PasswordlessAPIOptionsOriginal;
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
                    createdNewRecipeUser: boolean;
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
              | {
                    status: "SIGN_IN_UP_NOT_ALLOWED";
                    reason: string;
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
    createCodePOST:
        | undefined
        | ((
              input: (
                  | {
                        email: string;
                    }
                  | {
                        phoneNumber: string;
                    }
              ) & {
                  tenantId: string;
                  options: PasswordlessAPIOptions;
                  userContext: any;
              }
          ) => Promise<
              | {
                    status: "OK";
                    deviceId: string;
                    preAuthSessionId: string;
                    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
                }
              | {
                    status: "SIGN_IN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);
    resendCodePOST:
        | undefined
        | ((
              input: {
                  deviceId: string;
                  preAuthSessionId: string;
              } & {
                  tenantId: string;
                  options: PasswordlessAPIOptions;
                  userContext: any;
              }
          ) => Promise<
              | GeneralErrorResponse
              | {
                    status: "RESTART_FLOW_ERROR" | "OK";
                }
          >);
    consumeCodePOST:
        | undefined
        | ((
              input: (
                  | {
                        userInputCode: string;
                        deviceId: string;
                        preAuthSessionId: string;
                    }
                  | {
                        linkCode: string;
                        preAuthSessionId: string;
                    }
              ) & {
                  tenantId: string;
                  options: PasswordlessAPIOptions;
                  userContext: any;
              }
          ) => Promise<
              | {
                    status: "OK";
                    createdNewRecipeUser: boolean;
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
                    failedCodeInputAttemptCount: number;
                    maximumCodeInputAttempts: number;
                }
              | GeneralErrorResponse
              | {
                    status: "RESTART_FLOW_ERROR";
                }
              | {
                    status: "SIGN_IN_UP_NOT_ALLOWED";
                    reason: string;
                }
          >);
    passwordlessUserEmailExistsGET:
        | undefined
        | ((input: {
              email: string;
              tenantId: string;
              options: PasswordlessAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
    passwordlessUserPhoneNumberExistsGET:
        | undefined
        | ((input: {
              phoneNumber: string;
              tenantId: string;
              options: PasswordlessAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
};
export declare type TypeThirdPartyPasswordlessEmailDeliveryInput = TypePasswordlessEmailDeliveryInput;
export declare type TypeThirdPartyPasswordlessSmsDeliveryInput = TypePasswordlessSmsDeliveryInput;
export declare type ThirdPartyProviderInput = ProviderInput;
export declare type ThirdPartyProviderConfig = ProviderConfig;
export declare type ThirdPartyProviderClientConfig = ProviderClientConfig;
export declare type ThirdPartyProviderConfigForClientType = ProviderConfigForClientType;
