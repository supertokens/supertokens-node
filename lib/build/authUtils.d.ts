// @ts-nocheck
import { SessionContainerInterface } from "./recipe/session/types";
import { UserContext } from "./types";
import { User } from "./user";
import RecipeUserId from "./recipeUserId";
import { AccountInfoWithRecipeId } from "./recipe/accountlinking/types";
import { BaseRequest, BaseResponse } from "./framework";
export declare const AuthUtils: {
    getErrorStatusResponseWithReason<T = "SIGN_IN_UP_NOT_ALLOWED">(
        resp: {
            status: string;
        },
        errorCodeMap: Record<string, string | undefined>,
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
        factorIds,
        session,
        userContext,
    }: {
        accountInfo: AccountInfoWithRecipeId;
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
              isFirstFactor: boolean;
          }
        | {
              status: "SIGN_UP_NOT_ALLOWED";
          }
        | {
              status: "NON_PRIMARY_SESSION_USER";
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
              status: "LINKING_TO_SESSION_USER_FAILED" | "NON_PRIMARY_SESSION_USER";
          }
    >;
};
