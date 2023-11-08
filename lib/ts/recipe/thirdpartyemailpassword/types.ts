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
import { GeneralErrorResponse, User as GlobalUser, User } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};

export type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};

export type TypeInput = {
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

export type TypeNormalisedInput = {
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

export type RecipeInterface = {
    thirdPartyGetProvider(input: {
        thirdPartyId: string;
        clientType?: string;
        tenantId: string;
        userContext: any;
    }): Promise<TypeProvider | undefined>;

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
        tenantId: string;
        userContext: any;
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
              isValidFirstFactorForTenant: boolean | undefined;
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
              user: GlobalUser;
              recipeUserId: RecipeUserId;
              isValidFirstFactorForTenant: boolean | undefined;
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

    emailPasswordSignUp(input: {
        email: string;
        password: string;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: GlobalUser;
              recipeUserId: RecipeUserId;
              isValidFirstFactorForTenant: boolean | undefined;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
    >;

    createNewEmailPasswordRecipeUser(input: {
        email: string;
        password: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: GlobalUser;
              recipeUserId: RecipeUserId;
              isValidFirstFactorForTenant: boolean | undefined;
          }
        | { status: "EMAIL_ALREADY_EXISTS_ERROR" }
    >;

    emailPasswordSignIn(input: {
        email: string;
        password: string;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: GlobalUser;
              recipeUserId: RecipeUserId;
              isValidFirstFactorForTenant: boolean | undefined;
          }
        | { status: "WRONG_CREDENTIALS_ERROR" }
    >;

    createResetPasswordToken(input: {
        userId: string;
        email: string;
        tenantId: string;
        userContext: any;
    }): Promise<{ status: "OK"; token: string } | { status: "UNKNOWN_USER_ID_ERROR" }>;

    consumePasswordResetToken(input: {
        token: string;
        tenantId: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" }
    >;

    updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId;
        email?: string;
        password?: string;
        userContext: any;
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
        | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
    >;
};

export type EmailPasswordAPIOptions = EmailPasswordAPIOptionsOriginal;

export type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export type APIInterface = {
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
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    email: string;
                    user: GlobalUser;
                }
              | {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
                }
              | { status: "PASSWORD_POLICY_VIOLATED_ERROR"; failureReason: string }
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
                        oAuthTokens: { [key: string]: any };
                    }
              )
          ) => Promise<
              | {
                    status: "OK";
                    createdNewRecipeUser: boolean;
                    user: GlobalUser;
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
              options: EmailPasswordAPIOptions;
              userContext: any;
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
              userContext: any;
          }) => Promise<void>);
};

export type TypeThirdPartyEmailPasswordEmailDeliveryInput = TypeEmailPasswordEmailDeliveryInput;
export type ThirdPartyProviderInput = ProviderInput;
export type ThirdPartyProviderConfig = ProviderConfig;
export type ThirdPartyProviderClientConfig = ProviderClientConfig;
export type ThirdPartyProviderConfigForClientType = ProviderConfigForClientType;
