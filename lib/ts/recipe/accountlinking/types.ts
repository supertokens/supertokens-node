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
import { SessionContainerInterface } from "../session/types";

export type TypeInput = {
    onAccountLinked?: (user: User, newAccountInfo: RecipeLevelUser, userContext: any) => Promise<void>;
    shouldDoAutomaticAccountLinking?: (
        newAccountInfo: AccountInfoWithRecipeId,
        user: User | undefined,
        session: SessionContainerInterface | undefined,
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
        newAccountInfo: AccountInfoWithRecipeId,
        user: User | undefined,
        session: SessionContainerInterface | undefined,
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
    getRecipeUserIdsForPrimaryUserIds: (input: {
        primaryUserIds: string[];
        userContext: any;
    }) => Promise<{
        [primaryUserId: string]: string[]; // recipeUserIds. If input primary user ID doesn't exists, those ids will not be part of the output set.
    }>;
    getPrimaryUserIdsForRecipeUserIds: (input: {
        recipeUserIds: string[];
        userContext: any;
    }) => Promise<{
        [recipeUserId: string]: string | null; // if recipeUserId doesn't have a primaryUserId, then it will be mapped to `null`. If the input recipeUserId doesn't exist, then it won't be a part of the map
    }>;
    getUsers: (input: {
        timeJoinedOrder: "ASC" | "DESC";
        limit?: number;
        paginationToken?: string;
        includeRecipeIds?: string[];
        userContext: any;
    }) => Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    canCreatePrimaryUserId: (input: {
        recipeUserId: string;
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
        recipeUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              user: User;
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
    canLinkAccounts: (input: {
        recipeUserId: string;
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
    >;
    linkAccounts: (input: {
        recipeUserId: string;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              accountsAlreadyLinked: boolean;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
    >;
    unlinkAccounts: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              wasRecipeUserDeleted: boolean;
          }
        | {
              status: "PRIMARY_USER_NOT_FOUND_ERROR" | "RECIPE_USER_NOT_FOUND_ERROR";
              description: string;
          }
    >;
    getUser: (input: { userId: string; userContext: any }) => Promise<User | undefined>;
    listUsersByAccountInfo: (input: { accountInfo: AccountInfo; userContext: any }) => Promise<User[]>;
    deleteUser: (input: {
        userId: string;
        removeAllLinkedAccounts: boolean;
        userContext: any;
    }) => Promise<{ status: "OK" }>;
    fetchFromAccountToLinkTable: (input: { recipeUserId: string; userContext: any }) => Promise<string | undefined>;
    storeIntoAccountToLinkTable: (input: {
        recipeUserId: string;
        primaryUserId: string;
        userContext: any;
    }) => Promise<
        | { status: "OK"; didInsertNewRow: boolean }
        | { status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR"; primaryUserId: string }
    >;
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
    timeJoined: number;
    recipeUserId: string;
} & AccountInfoWithRecipeId;
