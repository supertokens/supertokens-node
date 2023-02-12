// @ts-nocheck
import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import type { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction, User } from "../../types";
import { SessionContainer } from "../session";
import type { TypeNormalisedInput, RecipeInterface, TypeInput, AccountInfoAndEmailWithRecipeId } from "./types";
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
    getIdentitiesForUser: (
        user: User
    ) => {
        verified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                id: string;
                userId: string;
            }[];
        };
        unverified: {
            emails: string[];
            phoneNumbers: string[];
            thirdpartyInfo: {
                id: string;
                userId: string;
            }[];
        };
    };
    isSignUpAllowed: ({
        info,
        userContext,
    }: {
        info: AccountInfoAndEmailWithRecipeId;
        userContext: any;
    }) => Promise<boolean>;
    doPostSignUpAccountLinkingOperations: ({
        info,
        infoVerified,
        recipeUserId,
        userContext,
    }: {
        info: AccountInfoAndEmailWithRecipeId;
        infoVerified: boolean;
        recipeUserId: string;
        userContext: any;
    }) => Promise<string>;
    accountLinkPostSignInViaSession: ({
        session,
        info,
        infoVerified,
        userContext,
    }: {
        session: SessionContainer;
        info: AccountInfoAndEmailWithRecipeId;
        infoVerified: boolean;
        userContext: any;
    }) => Promise<
        | {
              createRecipeUser: true;
              updateVerificationClaim: boolean;
          }
        | ({
              createRecipeUser: false;
          } & (
              | {
                    accountsLinked: true;
                    updateVerificationClaim: boolean;
                }
              | {
                    accountsLinked: false;
                    reason:
                        | "ACCOUNT_LINKING_NOT_ALLOWED_ERROR"
                        | "EXISTING_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR"
                        | "NEW_ACCOUNT_NEEDS_TO_BE_VERIFIED_ERROR";
                }
              | {
                    accountsLinked: false;
                    reason:
                        | "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                        | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                    primaryUserId: string;
                }
          ))
    >;
    getPrimaryUserIdThatCanBeLinkedToRecipeUserId: ({
        recipeUserId,
        userContext,
    }: {
        recipeUserId: string;
        userContext: any;
    }) => Promise<User | undefined>;
    createPrimaryUserIdOrLinkAccounts: ({
        recipeUserId,
        session,
        userContext,
    }: {
        recipeUserId: string;
        session: SessionContainer | undefined;
        userContext: any;
    }) => Promise<void>;
}
