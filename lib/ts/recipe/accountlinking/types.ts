/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import OverrideableBuilder from "supertokens-js-override";
import type { User } from "../../types";
import RecipeUserId from "../../recipeUserId";

export type TypeInput = {
    onAccountLinked?: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    shouldDoAutomaticAccountLinking?: (
        newAccountInfo: AccountInfoWithRecipeId & { recipeUserId?: RecipeUserId },
        user: User | undefined,
        tenantId: string,
        userContext: any
    ) => Promise<
        | {
              shouldAutomaticallyLink: false;
          }
        | {
              shouldAutomaticallyLink: true;
              shouldRequireVerification: boolean;
          }
    >;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
    };
};

export type TypeNormalisedInput = {
    onAccountLinked: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    shouldDoAutomaticAccountLinking: (
        newAccountInfo: AccountInfoWithRecipeId & { recipeUserId?: RecipeUserId },
        user: User | undefined,
        tenantId: string,
        userContext: any
    ) => Promise<
        | {
              shouldAutomaticallyLink: false;
          }
        | {
              shouldAutomaticallyLink: true;
              shouldRequireVerification: boolean;
          }
    >;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
    };
};

export type RecipeInterface = {
    getUsers: (input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        query?: { [key: string]: string };
        userContext: any;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    canCreatePrimaryUser: (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              wasAlreadyAPrimaryUser: boolean;
          }
        | {
              status:
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    createPrimaryUser: (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              user: User;
              wasAlreadyAPrimaryUser: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              user: User;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    canLinkAccounts: (input: {
        recipeUserId: RecipeUserId;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              accountsAlreadyLinked: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              description: string;
              primaryUserId: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
    >;
    linkAccounts: (input: {
        recipeUserId: RecipeUserId;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              accountsAlreadyLinked: boolean;
              user: User;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              user: User;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
    >;
    unlinkAccount: (input: {
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<{
        status: "OK";
        wasRecipeUserDeleted: boolean;
        wasLinked: boolean;
    }>;
    getUser: (input: { userId: string; userContext: any }) => Promise<User | undefined>;
    listUsersByAccountInfo: (input: {
        tenantId: string;
        accountInfo: AccountInfo;
        doUnionOfAccountInfo: boolean;
        userContext: any;
    }) => Promise<User[]>;
    deleteUser: (input: {
        userId: string;
        removeAllLinkedAccounts: boolean;
        userContext: any;
    }) => Promise<{ status: "OK" }>;
};

export type AccountInfo = {
    email?: string;
    phoneNumber?: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};

export type AccountInfoWithRecipeId = {
    recipeId: "emailpassword" | "thirdparty" | "passwordless";
} & AccountInfo;

export type RecipeLevelUser = {
    tenantIds: string[];
    timeJoined: number;
    recipeUserId: RecipeUserId;
} & AccountInfoWithRecipeId;
