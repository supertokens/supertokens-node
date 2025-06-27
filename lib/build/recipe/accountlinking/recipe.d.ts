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
    static RECIPE_ID: "accountlinking";
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
    static getInstanceOrThrowError(): Recipe;
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
    getPrimaryUserThatCanBeLinkedToRecipeUserId: ({
        tenantId,
        user,
        userContext,
    }: {
        tenantId: string;
        user: User;
        userContext: UserContext;
    }) => Promise<User | undefined>;
    getOldestUserThatCanBeLinkedToRecipeUser: ({
        tenantId,
        user,
        userContext,
    }: {
        tenantId: string;
        user: User;
        userContext: UserContext;
    }) => Promise<User | undefined>;
    isSignInAllowed: ({
        user,
        accountInfo,
        tenantId,
        session,
        signInVerifiesLoginMethod,
        userContext,
    }: {
        user: User;
        accountInfo: AccountInfoWithRecipeId | LoginMethod;
        session: SessionContainerInterface | undefined;
        signInVerifiesLoginMethod: boolean;
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
        user,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId | LoginMethod;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        tenantId: string;
        isSignIn: boolean;
        user: User | undefined;
        userContext: UserContext;
    }) => Promise<boolean>;
    isEmailChangeAllowed: (input: {
        user: User;
        newEmail: string;
        isVerified: boolean;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              allowed: true;
          }
        | {
              allowed: false;
              reason: "PRIMARY_USER_CONFLICT" | "ACCOUNT_TAKEOVER_RISK";
          }
    >;
    verifyEmailForRecipeUserIfLinkedAccountsAreVerified: (input: {
        user: User;
        recipeUserId: RecipeUserId;
        userContext: UserContext;
    }) => Promise<void>;
    shouldBecomePrimaryUser(
        user: User,
        tenantId: string,
        session: SessionContainerInterface | undefined,
        userContext: UserContext
    ): Promise<boolean>;
    tryLinkingByAccountInfoOrCreatePrimaryUser({
        inputUser,
        session,
        tenantId,
        userContext,
    }: {
        tenantId: string;
        inputUser: User;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "NO_LINK";
          }
    >;
}
