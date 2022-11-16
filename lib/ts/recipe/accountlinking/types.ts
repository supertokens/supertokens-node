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

import OverrideableBuilder from "supertokens-js-override";
import { SessionContainer } from "../session";

export type TypeInput = {
    onAccountLinked?: (
        user: User,
        newAccountInfo: RecipeLevelUser,
        userContext: any
    ) => Promise<void>,
    onAccountUnlinked?: (
        user: User,
        unlinkedAccount: RecipeLevelUser,
        userContext: any
    ) => Promise<void>,
    shouldDoAutomaticAccountLinking?: (
        newAccountInfo: AccountInfoAndEmailWithRecipeId,
        user: User | undefined,
        session: SessionContainer | undefined,
        userContext: any
    ) => Promise<{
        shouldAutomaticallyLink: false
    } | {
        shouldAutomaticallyLink: true,
        shouldRequireVerification: boolean
    }>
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type TypeNormalisedInput = {
    onAccountLinked: (
        user: User,
        newAccountInfo: RecipeLevelUser,
        userContext: any
    ) => Promise<void>,
    onAccountUnlinked: (
        user: User,
        unlinkedAccount: RecipeLevelUser,
        userContext: any
    ) => Promise<void>,
    shouldDoAutomaticAccountLinking: (
        newAccountInfo: AccountInfoAndEmailWithRecipeId,
        user: User | undefined,
        session: SessionContainer | undefined,
        userContext: any
    ) => Promise<{
        shouldAutomaticallyLink: false
    } | {
        shouldAutomaticallyLink: true,
        shouldRequireVerification: boolean
    }>
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};

export type APIInterface = {};

export type RecipeInterface = {
    canCreatePrimaryUserId: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<{
        status: "OK"
    } | {
        status: "PRIMARY_USER_ALREADY_EXISTS_FOR_RECIPE_USER_ID_ERROR"
        | "PRIMARY_USER_ALREADY_EXISTS_FOR_ACCOUNT_INFO_ERROR",
        primaryUserId: string
    }>,
    createPrimaryUser: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<{
        status: "OK",
        user: User
    } | {
        status: "PRIMARY_USER_ALREADY_EXISTS_FOR_RECIPE_USER_ID_ERROR"
            | "PRIMARY_USER_ALREADY_EXISTS_FOR_ACCOUNT_INFO_ERROR",
        primaryUserId: string
    }>,
    canLinkAccounts: (input: {
        recipeUserId: string;
        primaryUserId: string;
        userContext: any;
    }) => Promise<{
        status: "OK"
    } |{
        status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
        primaryUserId: string
    } | {
        status: "ACCOUNTS_ALREADY_LINKED_ERROR"
    } | {
        status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
        primaryUserId: string
    }>,
    linkAccounts: (input: {
        recipeUserId: string;
        primaryUserId: string;
        userContext: any;
    }) => Promise<{
        status: "OK"
    } |{
        status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
        primaryUserId: string
    } | {
        status: "ACCOUNTS_ALREADY_LINKED_ERROR"
    } | {
        status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR",
        primaryUserId: string
    }>,
    unlinkAccounts: (input: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<{
        status: "OK",
        wasRecipeUserDeleted: boolean
    }>
};

export type User = {
    id: string,
    isPrimaryUser: boolean,
    emails: string[],
    phoneNumbers: string[],
    thirdpartyInfo: {
        thirdpartyId: string,
        thirdpartyUserId: string
    }[],
    linkedRecipes: {
        recipeId: string,
        recipeUserId: string
    }[]
}

type RecipeLevelUser = {
    recipeId: "emailpassword" | "thirdparty" | "passwordless";
    recipeUserId: string;
    timeJoined: number;
    primaryUserId?: string;
    email?: string;
    phoneNumber?: string;
    thirdParty?: {
        id: string;
        userId: string;
    }
}

/**
 * TODO:
 * SuperTokens.getUser(userId: string) => User | undefined // userId can be primary or recipe
 * SuperTokens.listUsersByAccountInfo(info: AccountInfo) => User[] | undefined
 * SuperTokens.getUserByAccountInfo(info: AccountInfoWithAuthType) => User | undefined
 */
export type AccountInfo = {
    email: string
} | {
    thirdpartyId: string,
    thirdpartyUserId: string
} | {
    phoneNumber: string
}
 
export type AccountInfoWithRecipeId = {
    recipeId: "emailpassword" | "passwordless",
    email: string
} | {
    recipeId: "thirdparty",
    thirdpartyId: string,
    thirdpartyUserId: string
} | {
    recipeId: "passwordless",
    phoneNumber: string
}

// this is there cause we use this in the shouldDoAutomaticAccountLinking callback and that
// function takes in an input user. In case of thirdparty, if the input user doesn't have email,
// it will be strange for the developer, so we add an email to the "thirdparty" type as well. 
export type AccountInfoAndEmailWithRecipeId = {
    recipeId: "emailpassword" | "thirdparty" | "passwordless";
    email?: string;
    phoneNumber?: string;
    thirdParty?: {
        id: string;
        userId: string;
    }
}