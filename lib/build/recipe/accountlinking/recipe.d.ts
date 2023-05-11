// @ts-nocheck
import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, User } from "../../types";
import { SessionContainerInterface } from "../session/types";
import type { TypeNormalisedInput, RecipeInterface, TypeInput, AccountInfoWithRecipeId } from "./types";
export default class Recipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: string;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: TypeInput, _recipes: {}, _ingredients: {});
    static init(config: TypeInput): RecipeListFunction;
    static getInstanceOrThrowError(): Recipe;
    getAPIsHandled(): APIHandled[];
    handleAPIRequest(
        _id: string,
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
        recipeUserId,
        isVerified,
        checkAccountsToLinkTableAsWell,
        userContext,
    }: {
        recipeUserId: string;
        isVerified: boolean;
        checkAccountsToLinkTableAsWell: boolean;
        userContext: any;
    }) => Promise<string>;
    getPrimaryUserIdThatCanBeLinkedToRecipeUserId: ({
        recipeUserId,
        checkAccountsToLinkTableAsWell,
        userContext,
    }: {
        recipeUserId: string;
        checkAccountsToLinkTableAsWell: boolean;
        userContext: any;
    }) => Promise<User | undefined>;
    transformUserInfoIntoVerifiedAndUnverifiedBucket: (
        user: User
    ) => {
        verified: {
            emails: string[];
            phoneNumbers: string[];
        };
        unverified: {
            emails: string[];
            phoneNumbers: string[];
        };
    };
    isSignUpAllowed: ({
        newUser,
        userContext,
    }: {
        newUser: AccountInfoWithRecipeId;
        userContext: any;
    }) => Promise<boolean>;
    linkAccountsWithUserFromSession: <T>({
        session,
        newUser,
        createRecipeUserFunc,
        verifyCredentialsFunc,
        userContext,
    }: {
        session: SessionContainerInterface;
        newUser: AccountInfoWithRecipeId;
        createRecipeUserFunc: (userContext: any) => Promise<void>;
        verifyCredentialsFunc: (
            userContext: any
        ) => Promise<
            | {
                  status: "OK";
              }
            | {
                  status: "CUSTOM_RESPONSE";
                  resp: T;
              }
        >;
        userContext: any;
    }) => Promise<
        | {
              status: "OK";
              wereAccountsAlreadyLinked: boolean;
          }
        | {
              status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
              description: string;
          }
        | {
              status: "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
              primaryUserId: string;
              recipeUserId: string;
          }
        | {
              status: "CUSTOM_RESPONSE";
              resp: T;
          }
    >;
}
