// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
import RecipeUserId from "../../recipeUserId";
import { User } from "../../types";
export type TypeInput = {
    mode: "REQUIRED" | "OPTIONAL";
    emailDelivery?: EmailDeliveryTypeInput<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForRecipeUserId?: (
        recipeUserId: RecipeUserId,
        userContext: UserContext
    ) => Promise<
        | {
              status: "OK";
              email: string;
          }
        | {
              status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR";
          }
    >;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = {
    mode: "REQUIRED" | "OPTIONAL";
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForRecipeUserId?: (
        recipeUserId: RecipeUserId,
        userContext: UserContext
    ) => Promise<
        | {
              status: "OK";
              email: string;
          }
        | {
              status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR";
          }
    >;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type UserEmailInfo = {
    recipeUserId: RecipeUserId;
    email: string;
};
export type RecipeInterface = {
    createEmailVerificationToken(input: {
        recipeUserId: RecipeUserId;
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    verifyEmailUsingToken(input: {
        token: string;
        attemptAccountLinking: boolean;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: UserEmailInfo;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    isEmailVerified(input: { recipeUserId: RecipeUserId; email: string; userContext: UserContext }): Promise<boolean>;
    revokeEmailVerificationTokens(input: {
        recipeUserId: RecipeUserId;
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<{
        status: "OK";
    }>;
    unverifyEmail(input: { recipeUserId: RecipeUserId; email: string; userContext: UserContext }): Promise<{
        status: "OK";
    }>;
};
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypeEmailVerificationEmailDeliveryInput>;
};
export type APIInterface = {
    verifyEmailPOST:
        | undefined
        | ((input: {
              token: string;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
              session: SessionContainerInterface | undefined;
          }) => Promise<
              | {
                    status: "OK";
                    user: UserEmailInfo;
                    newSession?: SessionContainerInterface;
                }
              | {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
                }
              | GeneralErrorResponse
          >);
    isEmailVerifiedGET:
        | undefined
        | ((input: { options: APIOptions; userContext: UserContext; session: SessionContainerInterface }) => Promise<
              | {
                    status: "OK";
                    isVerified: boolean;
                    newSession?: SessionContainerInterface;
                }
              | GeneralErrorResponse
          >);
    generateEmailVerifyTokenPOST:
        | undefined
        | ((input: { options: APIOptions; userContext: UserContext; session: SessionContainerInterface }) => Promise<
              | {
                    status: "OK";
                }
              | {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR";
                    newSession?: SessionContainerInterface;
                }
              | GeneralErrorResponse
          >);
};
export type TypeEmailVerificationEmailDeliveryInput = {
    type: "EMAIL_VERIFICATION";
    user: {
        id: string;
        recipeUserId: RecipeUserId;
        email: string;
    };
    emailVerifyLink: string;
    tenantId: string;
};
export type GetEmailForRecipeUserIdFunc = (
    user: User | undefined,
    recipeUserId: RecipeUserId,
    userContext: UserContext
) => Promise<
    | {
          status: "OK";
          email: string;
      }
    | {
          status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR";
      }
>;
