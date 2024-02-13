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
    createPrimaryUserIdOrLinkByAccountInfoOrLinkToSessionIfProvided: ({
        tenantId,
        inputUser,
        recipeUserId,
        session,
        userContext,
    }: {
        tenantId: string;
        inputUser: User;
        recipeUserId: RecipeUserId;
        session: SessionContainerInterface | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
        | {
              status: "NON_PRIMARY_SESSION_USER";
              reason: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
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
    getPrimarySessionUser: (
        session: SessionContainerInterface,
        tenantId: string,
        userContext: UserContext
    ) => Promise<
        | {
              status: "OK";
              sessionUser: User;
          }
        | {
              status: "SHOULD_AUTOMATICALLY_LINK_FALSE";
          }
        | {
              status: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
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
    private shouldBecomePrimaryUser;
    private tryLinkingBySession;
    tryLinkingByAccountInfo({
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
              status: "NO_LINK" | "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
        | {
              status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR";
              primaryUserId: string;
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
    >;
    /**
     * Tries to link user1 and user2, trying to link to the primary user or the older user first making it primary if necessary.
     *
     * It returns the following status codes:
     *
     * OK: If linking succeeded.
     *
     * NO_LINK: If the linking failed because of shoulDoAutomaticAccountLinking/email verification status either during linking or creating a primary user.
     *
     * The following should be retryable errors, that indicate that some information passed to the function was outdated:
     *
     * INPUT_USER_IS_NOT_A_PRIMARY_USER: if some race condition concurrently the primary user we were trying to link to while this function was running
     *
     * RECIPE_USER_ID_ALREADY_LINKED_WITH_PRIMARY_USER_ID_ERROR: From the core response when creating a primary user.
     *
     * ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR: From the core response when creating a primary user or linking the users.
     *
     * RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:  From the core reponse when linking the users.
     */
    private tryLinkAccounts;
    /**
     * Checks if the two users passed to it are linked
     * The second (otherUser) can be a primary as well. If it's not primary, we check if there is a loginMethod in the primary user
     * with a matching recipeUserId to ensure this check also works in case of outdated information in the otherUser obj.
     * This can come into play if the otherUser (which was loaded for example by a sign-in API) is concurrently linked to a primary user
     * (i.e.: the session user).
     */
    isLinked(primaryUser: User, otherUser: User): boolean;
}
