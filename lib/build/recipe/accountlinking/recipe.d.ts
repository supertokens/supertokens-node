// @ts-nocheck
import error from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, User, UserContext } from "../../types";
import type { TypeNormalisedInput, RecipeInterface, TypeInput, AccountInfoWithRecipeId } from "./types";
import RecipeUserId from "../../recipeUserId";
import { LoginMethod } from "../../user";
import { SessionContainerInterface } from "../session/types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    constructor(
        recipeId: string,
        appInfo: NormalisedAppinfo,
        config: TypeInput | undefined,
        _recipes: {},
        _ingredients: {}
    );
    static init(config?: TypeInput): RecipeListFunction;
    static getInstance(): Recipe;
    getAPIsHandled(): APIHandled[];
    handleAPIRequest(
        _id: string,
        _tenantId: string,
        _req: BaseRequest,
        _response: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod
    ): Promise<boolean>;
    handleError(error: error, _request: BaseRequest, _response: BaseResponse): Promise<void>;
    getAllCORSHeaders(): string[];
    isErrorFromThisRecipe(err: any): err is error;
    static reset(): void;
    createPrimaryUserIdOrLinkByAccountInfo: ({
        tenantId,
        user: inputUser,
        recipeUserId,
        session,
        userContext,
    }: {
        tenantId: string;
        user: User;
        recipeUserId: RecipeUserId;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED" | "NON_PRIMARY_SESSION_USER";
          }
    >;
    getUsersThatCanBeLinkedToRecipeUser: ({
        tenantId,
        user,
        userContext,
    }: {
        tenantId: string;
        user: User;
        userContext: UserContext;
    }) => Promise<{
        primaryUser: User | undefined;
        oldestUser: User | undefined;
    }>;
    isSignInAllowed: ({
        user,
        tenantId,
        session,
        userContext,
    }: {
        user: User;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<boolean>;
    isSignUpAllowed: ({
        newUser,
        isVerified,
        session,
        tenantId,
        userContext,
    }: {
        newUser: AccountInfoWithRecipeId;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        userContext: UserContext;
    }) => Promise<boolean>;
    isSignInUpAllowedHelper: ({
        accountInfo,
        isVerified,
        session,
        tenantId,
        isSignIn,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId | LoginMethod;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        isSignIn: boolean;
        userContext: UserContext;
    }) => Promise<boolean>;
    isEmailChangeAllowed: (input: {
        user?: User;
        newEmail: string;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }) => Promise<boolean>;
    verifyEmailForRecipeUserIfLinkedAccountsAreVerified: (input: {
        user: User;
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<void>;
    private tryLinkingBySession;
    private tryLinkingByAccountInfo;
    shouldBecomePrimaryUser(
        user: User,
        tenantId: string,
        session: SessionContainerInterface | undefined,
        userContext: UserContext
    ): Promise<boolean>;
    tryLinkAccounts(
        user1: User,
        user2: User,
        session: SessionContainerInterface | undefined,
        tenantId: string,
        userContext: UserContext
    ): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "BOTH_USERS_PRIMARY" | "NO_LINK" | "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
              description: string;
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
              user: User;
          }
    >;
    isLinked(primaryUser: User, otherUser: User): boolean;
}
