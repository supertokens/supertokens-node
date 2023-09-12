// @ts-nocheck
import error from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, User } from "../../types";
import type { TypeNormalisedInput, RecipeInterface, TypeInput, AccountInfoWithRecipeId } from "./types";
import RecipeUserId from "../../recipeUserId";
import { LoginMethod } from "../../user";
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
    createPrimaryUserIdOrLinkAccounts: ({
        tenantId,
        user,
        userContext,
    }: {
        tenantId: string;
        user: User;
        userContext: any;
    }) => Promise<User>;
    getPrimaryUserThatCanBeLinkedToRecipeUserId: ({
        tenantId,
        user,
        userContext,
    }: {
        tenantId: string;
        user: User;
        userContext: any;
    }) => Promise<User | undefined>;
    isSignInAllowed: ({
        user,
        tenantId,
        userContext,
    }: {
        user: User;
        tenantId: string;
        userContext: any;
    }) => Promise<boolean>;
    isSignUpAllowed: ({
        newUser,
        isVerified,
        tenantId,
        userContext,
    }: {
        newUser: AccountInfoWithRecipeId;
        isVerified: boolean;
        tenantId: string;
        userContext: any;
    }) => Promise<boolean>;
    isSignInUpAllowedHelper: ({
        accountInfo,
        isVerified,
        tenantId,
        isSignIn,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId | LoginMethod;
        isVerified: boolean;
        tenantId: string;
        isSignIn: boolean;
        userContext: any;
    }) => Promise<boolean>;
    isEmailChangeAllowed: (input: {
        user?: User;
        newEmail: string;
        isVerified: boolean;
        userContext: any;
    }) => Promise<boolean>;
    verifyEmailForRecipeUserIfLinkedAccountsAreVerified: (input: {
        user: User;
        recipeUserId: RecipeUserId;
        userContext: any;
    }) => Promise<void>;
}
