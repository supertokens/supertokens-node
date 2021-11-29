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

import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";

// As per https://github.com/supertokens/supertokens-core/issues/325

export type User = {
    id: string;
    email?: string;
    phoneNumber?: string;
    joinedAt: string;
};

export type TypeInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber?: (phoneNumber: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomTextMessage?: (
              input: {
                  // Where the message should be delivered.
                  phoneNumber: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress?: (email: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomEmail?: (
              input: {
                  // Where the message should be delivered.
                  email: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";

    // Customize information in the URL.
    // By default: `${websiteDomain}/auth/verify`
    // `?rid=passwordless&preAuthSessionId=${preAuthSessionId}#${linkCode}` will be added after it.
    getLinkDomainAndPath?: (
        contactInfo:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any
    ) => Promise<string> | string;

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
    getCustomUserInputCode?: (userContext: any) => Promise<string> | string;

    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = (
    | {
          contactMethod: "PHONE";
          validatePhoneNumber: (phoneNumber: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomTextMessage: (
              input: {
                  // Where the message should be delivered.
                  phoneNumber: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
    | {
          contactMethod: "EMAIL";
          validateEmailAddress: (email: string) => Promise<string | undefined> | string | undefined;

          // Override to use custom template/contact method
          createAndSendCustomEmail: (
              input: {
                  // Where the message should be delivered.
                  email: string;
                  // This has to be entered on the starting device  to finish sign in/up
                  userInputCode?: string;
                  // Full url that the end-user can click to finish sign in/up
                  urlWithLinkCode?: string;
                  codeLifetime: number;
                  // Unlikely, but someone could display this (or a derived thing) to identify the device
                  preAuthSessionId: string;
              },
              userContext: any
          ) => Promise<void>;
      }
) & {
    flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";

    // Customize information in the URL.
    // By default: `${websiteDomain}/auth/verify`
    // `?rid=passwordless&preAuthSessionId=${preAuthSessionId}#${linkCode}` will be added after it.
    getLinkDomainAndPath: (
        contactInfo:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any
    ) => Promise<string> | string;

    // Override this to override how user input codes are generated
    // By default (=undefined) it is done in the Core
    getCustomUserInputCode?: (userContext: any) => Promise<string> | string;

    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type RecipeInterface = {
    createCode: (
        input: (
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              }
        ) & { userInputCode?: string },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              preAuthSessionId: string;
              codeId: string;
              deviceId: string;
              code: string;
              linkCode: string;
              codeLifetime: number;
              timeCreated: number;
          }
        | { status: "USER_INPUT_CODE_ALREADY_USED_ERROR" }
    >;
    resendCode: (
        input: {
            deviceId: string;
            userInputCode?: string;
        },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              preAuthSessionId: string;
              codeId: string;
              deviceId: string;
              code: string;
              linkCode: string;
              codeLifetime: number;
              timeCreated: number;
          }
        | { status: "RESTART_FLOW_ERROR" }
        | { status: "USER_INPUT_CODE_ALREADY_USED_ERROR" }
    >;
    consumeCode: (
        input:
            | {
                  userInputCode: string;
                  deviceId: string;
              }
            | {
                  linkCode: string;
              },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              preAuthSessionId: string;
              createdNewUser: boolean;
              user: User;
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | { status: "RESTART_FLOW_ERROR" }
    >;

    getUserById: (
        input: {
            userId: string;
        },
        userContext: any
    ) => Promise<User | undefined>;
    getUserByEmail: (
        input: {
            email: string;
        },
        userContext: any
    ) => Promise<User | undefined>;
    getUserByPhoneNumber: (
        input: {
            phoneNumber: string;
        },
        userContext: any
    ) => Promise<User | undefined>;

    updateUser: (
        input: {
            userId: string;
            email?: string | null;
            phoneNumber?: string | null;
        },
        userContext: any
    ) => Promise<{
        status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR" | "PHONE_NUMBER_ALREADY_EXISTS_ERROR";
    }>;

    revokeAllCodes: (
        input:
            | {
                  email: string;
              }
            | {
                  phoneNumber: string;
              },
        userContext: any
    ) => Promise<{
        status: "OK";
    }>;

    revokeCode: (
        input: {
            codeId: string;
        },
        userContext: any
    ) => Promise<{
        status: "OK";
    }>;

    listCodesByEmail: (
        input: {
            email: string;
        },
        userContext: any
    ) => Promise<ListCodeOutputType>;

    listCodesByPhoneNumber: (
        input: {
            phoneNumber: string;
        },
        userContext: any
    ) => Promise<ListCodeOutputType>;

    listCodesByDeviceId: (
        input: {
            deviceId: string;
        },
        userContext: any
    ) => Promise<ListCodeOutputType>;

    listCodesByPreAuthSessionId: (
        input: {
            preAuthSessionId: string;
        },
        userContext: any
    ) => Promise<ListCodeOutputType>;
};

type ListCodeOutputType = {
    status: "OK";
    devices: {
        preAuthSessionId: string;

        failedCodeInputAttemptCount: number;

        email?: string;
        phoneNumber?: string;

        codes: {
            codeId: string;
            timeCreated: string;
            codeLifetime: number;
        }[];
    }[];
};

export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};

export type APIInterface = {
    createCodePOST?: (
        input: ({ email: string } | { phoneNumber: string }) & {
            options: APIOptions;
        },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              deviceId: string;
              preAuthSessionId: string;
              flowType: "USER_INPUT_CODE" | "MAGIC_LINK" | "USER_INPUT_CODE_AND_MAGIC_LINK";
          }
        | { status: "GENERAL_ERROR"; message: string }
    >;

    resendCodePOST?: (
        input: { deviceId: string; preAuthSessionId: string } & {
            options: APIOptions;
        },
        userContext: any
    ) => Promise<{ status: "GENERAL_ERROR"; message: string } | { status: "RESTART_FLOW_ERROR" | "OK" }>;

    consumeCodePOST?: (
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
            options: APIOptions;
        },
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: { id: string; email?: string; phoneNumber?: string };
              session: SessionContainerInterface;
          }
        | {
              status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR";
              failedCodeInputAttemptCount: number;
              maximumCodeInputAttempts: number;
          }
        | { status: "GENERAL_ERROR"; message: string }
        | { status: "RESTART_FLOW_ERROR" }
    >;

    emailExistsGET?: (
        input: {
            email: string;
            options: APIOptions;
        },
        userContext: any
    ) => Promise<{
        status: "OK";
        exists: boolean;
    }>;

    phoneNumberExistsGET?: (
        input: {
            phoneNumber: string;
            options: APIOptions;
        },
        userContext: any
    ) => Promise<{
        status: "OK";
        exists: boolean;
    }>;
};
