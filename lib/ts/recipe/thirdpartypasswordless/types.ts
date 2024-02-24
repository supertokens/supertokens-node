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
import { GeneralErrorResponse, User, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type DeviceType = DeviceTypeOriginal;

export type TypeInput = (
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

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
    getCustomUserInputCode?: (tenantId: string, userContext: UserContext) => Promise<string> | string;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = (
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

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
    getCustomUserInputCode?: (tenantId: string, userContext: UserContext) => Promise<string> | string;
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

export type RecipeInterface = {
    thirdPartySignInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        isVerified: boolean;
        oAuthTokens: { [key: string]: any };
        rawUserInfoFromProvider: {
            fromIdTokenPayload?: { [key: string]: any };
            fromUserInfoAPI?: { [key: string]: any };
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
              oAuthTokens: { [key: string]: any };
              rawUserInfoFromProvider: {
                  fromIdTokenPayload?: { [key: string]: any };
                  fromUserInfoAPI?: { [key: string]: any };
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
        tenantId: string;
        session: SessionContainerInterface | undefined;
        shouldAttemptAccountLinkingIfAllowed: boolean;
        userContext: UserContext;
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
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;

    thirdPartyGetProvider(input: {
        thirdPartyId: string;
        clientType?: string;
        tenantId: string;
        userContext: UserContext;
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
            session: SessionContainerInterface | undefined;
            tenantId: string;
            userContext: UserContext;
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
        userContext: UserContext;
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
        | { status: "RESTART_FLOW_ERROR" | "USER_INPUT_CODE_ALREADY_USED_ERROR" }
    >;

    consumeCode: (
        input:
            | {
                  userInputCode: string;
                  deviceId: string;
                  preAuthSessionId: string;
                  tenantId: string;
                  session: SessionContainerInterface | undefined;
                  userContext: UserContext;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
                  tenantId: string;
                  session: SessionContainerInterface | undefined;
                  userContext: UserContext;
              }
    ) => Promise<
        | {
              status: "OK";
              consumedDevice: {
                  preAuthSessionId: string;
                  failedCodeInputAttemptCount: number;
                  email?: string;
                  phoneNumber?: string;
              };
              createdNewRecipeUser: boolean;
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | { status: "RESTART_FLOW_ERROR" }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;

    verifyCode: (
        input:
            | {
                  userInputCode: string;
                  deviceId: string;
                  preAuthSessionId: string;
                  deleteCode: boolean;
                  tenantId: string;
                  userContext: UserContext;
              }
            | {
                  linkCode: string;
                  preAuthSessionId: string;
                  deleteCode: boolean;
                  tenantId: string;
                  userContext: UserContext;
              }
    ) => Promise<
        | {
              status: "OK";
              consumedDevice: {
                  preAuthSessionId: string;
                  failedCodeInputAttemptCount: number;
                  email?: string;
                  phoneNumber?: string;
              };
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | { status: "RESTART_FLOW_ERROR" }
    >;

    updatePasswordlessUser: (input: {
        recipeUserId: RecipeUserId;
        email?: string | null;
        phoneNumber?: string | null;
        userContext: UserContext;
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
                  userContext: UserContext;
              }
            | {
                  phoneNumber: string;
                  tenantId: string;
                  userContext: UserContext;
              }
    ) => Promise<{
        status: "OK";
    }>;

    revokeCode: (input: {
        codeId: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<{
        status: "OK";
    }>;

    listCodesByEmail: (input: { email: string; tenantId: string; userContext: UserContext }) => Promise<DeviceType[]>;

    listCodesByPhoneNumber: (input: {
        phoneNumber: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<DeviceType[]>;

    listCodesByDeviceId: (input: {
        deviceId: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<DeviceType | undefined>;

    listCodesByPreAuthSessionId: (input: {
        preAuthSessionId: string;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<DeviceType | undefined>;
};

export type PasswordlessAPIOptions = PasswordlessAPIOptionsOriginal;

export type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export type APIInterface = {
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
                        oAuthTokens: { [key: string]: any };
                    }
              )
          ) => Promise<
              | {
                    status: "OK";
                    createdNewRecipeUser: boolean;
                    user: User;
                    session: SessionContainerInterface;
                    oAuthTokens: { [key: string]: any };
                    rawUserInfoFromProvider: {
                        fromIdTokenPayload?: { [key: string]: any };
                        fromUserInfoAPI?: { [key: string]: any };
                    };
                }
              | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
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
              userContext: UserContext;
          }) => Promise<void>);

    createCodePOST:
        | undefined
        | ((
              input: ({ email: string } | { phoneNumber: string }) & {
                  tenantId: string;
                  session: SessionContainerInterface | undefined;
                  options: PasswordlessAPIOptions;
                  userContext: UserContext;
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
              input: { deviceId: string; preAuthSessionId: string } & {
                  tenantId: string;
                  session: SessionContainerInterface | undefined;
                  options: PasswordlessAPIOptions;
                  userContext: UserContext;
              }
          ) => Promise<GeneralErrorResponse | { status: "RESTART_FLOW_ERROR" | "OK" }>);

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
                  session: SessionContainerInterface | undefined;
                  options: PasswordlessAPIOptions;
                  userContext: UserContext;
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
              | { status: "RESTART_FLOW_ERROR" }
              | {
                    status: "SIGN_IN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);

    passwordlessUserEmailExistsGET:
        | undefined
        | ((input: {
              email: string;
              tenantId: string;
              options: PasswordlessAPIOptions;
              userContext: UserContext;
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
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
};

export type TypeThirdPartyPasswordlessEmailDeliveryInput = TypePasswordlessEmailDeliveryInput;

export type TypeThirdPartyPasswordlessSmsDeliveryInput = TypePasswordlessSmsDeliveryInput;

export type ThirdPartyProviderInput = ProviderInput;
export type ThirdPartyProviderConfig = ProviderConfig;
export type ThirdPartyProviderClientConfig = ProviderClientConfig;
export type ThirdPartyProviderConfigForClientType = ProviderConfigForClientType;
