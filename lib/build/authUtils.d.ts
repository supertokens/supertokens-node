// @ts-nocheck
import { SessionContainerInterface } from "./recipe/session/types";
import { UserContext } from "./types";
import { LoginMethod, User } from "./user";
import RecipeUserId from "./recipeUserId";
import { AccountInfoWithRecipeId } from "./recipe/accountlinking/types";
import { BaseRequest, BaseResponse } from "./framework";
export declare const AuthUtils: {
    /**
     * This helper function can be used to map error statuses (w/ an optional reason) to error responses with human readable reasons.
     * This maps to a response in the format of `{ status: "3rd param", reason: "human readable string from second param" }`
     *
     * The errorCodeMap is expected to be something like:
     * ```
     * {
     *      EMAIL_VERIFICATION_REQUIRED: "This is returned as reason if the resp(1st param) has the status code EMAIL_VERIFICATION_REQUIRED and an undefined reason",
     *      STATUS: {
     *          REASON: "This is returned as reason if the resp(1st param) has STATUS in the status prop and REASON in the reason prop"
     *      }
     * }
     * ```
     */
    getErrorStatusResponseWithReason<T = "SIGN_IN_UP_NOT_ALLOWED">(
        resp: {
            status: string;
            reason?: string;
        },
        errorCodeMap: Record<string, Record<string, string | undefined> | string | undefined>,
        errorStatus: T
    ): {
        status: T;
        reason: string;
    };
    /**
     * Runs all checks we need to do before trying to authenticate a user:
     * - if this is a first factor auth or not
     * - if the session user is required to be primary (and tries to make it primary if necessary)
     * - if any of the factorids are valid (as first or secondary factors), taking into account mfa factor setup rules
     * - if sign up is allowed (if isSignUp === true)
     *
     * It returns the following statuses:
     * - OK: the auth flow can proceed
     * - SIGN_UP_NOT_ALLOWED: if isSignUpAllowed returned false. This is mostly because of conflicting users with the same account info
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should become primary but we couldn't make it primary because of a conflicting primary user.
     */
    preAuthChecks: ({
        authenticatingAccountInfo,
        tenantId,
        isSignUp,
        isVerified,
        signInVerifiesLoginMethod,
        authenticatingUser,
        factorIds,
        skipSessionUserUpdateInCore,
        session,
        shouldTryLinkingWithSessionUser,
        userContext,
    }: {
        authenticatingAccountInfo: AccountInfoWithRecipeId;
        authenticatingUser: User | undefined;
        tenantId: string;
        factorIds: string[];
        isSignUp: boolean;
        isVerified: boolean;
        signInVerifiesLoginMethod: boolean;
        skipSessionUserUpdateInCore: boolean;
        session?: SessionContainerInterface;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              validFactorIds: string[];
              isFirstFactor: boolean;
          }
        | {
              status: "SIGN_UP_NOT_ALLOWED";
          }
        | {
              status: "SIGN_IN_NOT_ALLOWED";
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason: "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    /**
     * Runs the linking process and all check we need to before creating a session + creates the new session if necessary:
     * - runs the linking process which will: try to link to the session user, or link by account info or try to make the authenticated user primary
     * - checks if sign in is allowed (if isSignUp === false)
     * - creates a session if necessary
     * - marks the factor as completed if necessary
     *
     * It returns the following statuses:
     * - OK: the auth flow went as expected
     * - LINKING_TO_SESSION_USER_FAILED(EMAIL_VERIFICATION_REQUIRED): if we couldn't link to the session user because linking requires email verification
     * - LINKING_TO_SESSION_USER_FAILED(RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because the authenticated user has been linked to another primary user concurrently
     * - LINKING_TO_SESSION_USER_FAILED(ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because of a conflicting primary user that has the same account info as authenticatedUser
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should be primary but we couldn't make it primary because of a conflicting primary user.
     */
    postAuthChecks: ({
        authenticatedUser,
        recipeUserId,
        isSignUp,
        factorId,
        session,
        req,
        res,
        tenantId,
        userContext,
    }: {
        authenticatedUser: User;
        recipeUserId: RecipeUserId;
        tenantId: string;
        factorId: string;
        isSignUp: boolean;
        session?: SessionContainerInterface;
        userContext: UserContext;
        req: BaseRequest;
        res: BaseResponse;
    }) => Promise<
        | {
              status: "OK";
              session: SessionContainerInterface;
              user: User;
          }
        | {
              status: "SIGN_IN_NOT_ALLOWED";
          }
    >;
    /**
     * This function tries to find the authenticating user (we use this information to see if the current auth is sign in or up)
     * if a session was passed and the authenticating user was not found on the current tenant, it checks if the session user
     * has a matching login method on other tenants. If it does and the credentials check out on the other tenant, it associates
     * the recipe user for the login method (matching account info, recipeId and credentials) with the current tenant.
     *
     * While this initially complicates the auth logic, we want to avoid creating a new recipe user if a tenant association will do,
     * because it'll make managing MFA factors (i.e.: secondary passwords) a lot easier for the app, and,
     * most importantly, this way all secondary factors are app-wide instead of mixing app-wide (totp) and tenant-wide (password) factors.
     */
    getAuthenticatingUserAndAddToCurrentTenantIfRequired: ({
        recipeId,
        accountInfo,
        checkCredentialsOnTenant,
        tenantId,
        session,
        userContext,
    }: {
        recipeId: string;
        accountInfo:
            | {
                  email: string;
                  thirdParty?: undefined;
                  phoneNumber?: undefined;
                  webauthn?: undefined;
              }
            | {
                  email?: undefined;
                  thirdParty?: undefined;
                  phoneNumber: string;
                  webauthn?: undefined;
              }
            | {
                  email?: undefined;
                  thirdParty: {
                      id: string;
                      userId: string;
                  };
                  phoneNumber?: undefined;
                  webauthn?: undefined;
              }
            | {
                  email?: undefined;
                  thirdParty?: undefined;
                  phoneNumber?: undefined;
                  webauthn: {
                      credentialId: string;
                  };
              };
        tenantId: string;
        session: SessionContainerInterface | undefined;
        checkCredentialsOnTenant: (tenantId: string) => Promise<boolean>;
        userContext: UserContext;
    }) => Promise<
        | {
              user: User;
              loginMethod: LoginMethod;
          }
        | undefined
    >;
    /**
     * This function checks if the current authentication attempt should be considered a first factor or not.
     * To do this it'll also need to (if a session was passed):
     * - load the session user (and possibly make it primary)
     * - check the linking status of the input and session user
     * - call and check the results of shouldDoAutomaticAccountLinking
     * So in the non-first factor case it also returns the results of those checks/operations.
     *
     * It returns the following statuses:
     * - OK: if everything went well
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should be primary but we couldn't make it primary because of a conflicting primary user.
     */
    checkAuthTypeAndLinkingStatus: (
        session: SessionContainerInterface | undefined,
        shouldTryLinkingWithSessionUser: boolean | undefined,
        accountInfo: AccountInfoWithRecipeId,
        inputUser: User | undefined,
        skipSessionUserUpdateInCore: boolean,
        userContext: UserContext
    ) => Promise<
        | {
              status: "OK";
              isFirstFactor: true;
          }
        | {
              status: "OK";
              isFirstFactor: false;
              inputUserAlreadyLinkedToSessionUser: true;
              sessionUser: User;
          }
        | {
              status: "OK";
              isFirstFactor: false;
              inputUserAlreadyLinkedToSessionUser: false;
              sessionUser: User;
              linkingToSessionUserRequiresVerification: boolean;
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason: "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    /**
     * This function checks the auth type (first factor or not), links by account info for first factor auths otherwise
     * it tries to link the input user to the session user
     *
     * It returns the following statuses:
     * - OK: the linking went as expected
     * - LINKING_TO_SESSION_USER_FAILED(EMAIL_VERIFICATION_REQUIRED): if we couldn't link to the session user because linking requires email verification
     * - LINKING_TO_SESSION_USER_FAILED(RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because the authenticated user has been linked to another primary user concurrently
     * - LINKING_TO_SESSION_USER_FAILED(ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because of a conflicting primary user that has the same account info as authenticatedUser
     * - LINKING_TO_SESSION_USER_FAILED (SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if the session user should be primary but we couldn't make it primary because of a conflicting primary user.
     */
    linkToSessionIfRequiredElseCreatePrimaryUserIdOrLinkByAccountInfo: ({
        tenantId,
        inputUser,
        recipeUserId,
        session,
        shouldTryLinkingWithSessionUser,
        userContext,
    }: {
        tenantId: string;
        inputUser: User;
        recipeUserId: RecipeUserId;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
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
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    /**
     * This function loads the session user and tries to make it primary.
     * It returns:
     * - OK: if the session user was a primary user or we made it into one or it can/should become one but `skipSessionUserUpdateInCore` is set to true
     * - SHOULD_AUTOMATICALLY_LINK_FALSE: if shouldDoAutomaticAccountLinking returned `{ shouldAutomaticallyLink: false }`
     * - ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR:
     * If we tried to make it into a primary user but it didn't succeed because of a conflicting primary user
     *
     * It throws INVALID_CLAIM_ERROR if shouldDoAutomaticAccountLinking returned `{ shouldAutomaticallyLink: false }` but the email verification status was wrong
     */
    tryAndMakeSessionUserIntoAPrimaryUser: (
        session: SessionContainerInterface,
        skipSessionUserUpdateInCore: boolean,
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
    /**
     * This function tries linking by session, and doesn't attempt to make the authenticated user a primary or link it by account info
     *
     * It returns the following statuses:
     * - OK: the linking went as expected
     * - LINKING_TO_SESSION_USER_FAILED(EMAIL_VERIFICATION_REQUIRED): if we couldn't link to the session user because linking requires email verification
     * - LINKING_TO_SESSION_USER_FAILED(RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because the authenticated user has been linked to another primary user concurrently
     * - LINKING_TO_SESSION_USER_FAILED(ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR):
     * if we couldn't link to the session user because of a conflicting primary user that has the same account info as authenticatedUser
     * - LINKING_TO_SESSION_USER_FAILED (INPUT_USER_IS_NOT_A_PRIMARY_USER):
     * if the session user is not primary. This can be resolved by making it primary and retrying the call.
     */
    tryLinkingBySession: ({
        linkingToSessionUserRequiresVerification,
        authLoginMethod,
        authenticatedUser,
        sessionUser,
        userContext,
    }: {
        authenticatedUser: User;
        linkingToSessionUserRequiresVerification: boolean;
        sessionUser: User;
        authLoginMethod: LoginMethod;
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
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason: "INPUT_USER_IS_NOT_A_PRIMARY_USER";
          }
    >;
    filterOutInvalidFirstFactorsOrThrowIfAllAreInvalid: (
        factorIds: string[],
        tenantId: string,
        hasSession: boolean,
        userContext: UserContext
    ) => Promise<string[]>;
    loadSessionInAuthAPIIfNeeded: (
        req: BaseRequest,
        res: BaseResponse,
        shouldTryLinkingWithSessionUser: boolean | undefined,
        userContext: UserContext
    ) => Promise<SessionContainerInterface | undefined>;
};
