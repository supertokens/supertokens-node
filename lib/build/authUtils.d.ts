// @ts-nocheck
import { SessionContainerInterface } from "./recipe/session/types";
import { UserContext } from "./types";
import { LoginMethod, User } from "./user";
import RecipeUserId from "./recipeUserId";
import { AccountInfoWithRecipeId } from "./recipe/accountlinking/types";
import { BaseRequest, BaseResponse } from "./framework";
export declare const AuthUtils: {
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
    preAuthChecks: ({
        accountInfo,
        tenantId,
        isSignUp,
        isVerified,
        inputUser,
        factorIds,
        session,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId;
        inputUser: User | undefined;
        tenantId: string;
        factorIds: string[];
        isSignUp: boolean;
        isVerified: boolean;
        session?: SessionContainerInterface | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              validFactorIds: string[];
          }
        | {
              status: "SIGN_UP_NOT_ALLOWED";
          }
        | {
              status: "NON_PRIMARY_SESSION_USER";
              reason: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
        | {
              status: "INVALID_FIRST_FACTOR";
          }
    >;
    postAuthChecks: ({
        responseUser,
        recipeUserId,
        isSignUp,
        factorId,
        session,
        req,
        res,
        tenantId,
        userContext,
    }: {
        responseUser: User;
        recipeUserId: RecipeUserId;
        tenantId: string;
        factorId: string;
        isSignUp: boolean;
        session?: SessionContainerInterface | undefined;
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
    getAuthenticatingUserAndAddToCurrentTenantIfRequired: ({
        recipeId,
        accountInfo,
        checkCredentialsOnTenant,
        session,
        userContext,
    }: {
        recipeId: string;
        accountInfo:
            | {
                  email: string;
                  thirdParty?: undefined;
                  phoneNumber?: undefined;
              }
            | {
                  email?: undefined;
                  thirdParty?: undefined;
                  phoneNumber: string;
              }
            | {
                  email?: undefined;
                  thirdParty: {
                      id: string;
                      userId: string;
                  };
                  phoneNumber?: undefined;
              };
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
    checkAuthTypeAndLinkingStatus: (
        session: SessionContainerInterface | undefined,
        accountInfo: AccountInfoWithRecipeId,
        inputUser: User | undefined,
        tenantId: string,
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
              sessionUserLinkingRequiresVerification: boolean;
          }
        | {
              status: "NON_PRIMARY_SESSION_USER";
              reason: "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
};
