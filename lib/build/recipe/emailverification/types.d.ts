// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo } from "../../types";
import { SessionContainerInterface } from "../session/types";
export declare type TypeInput = {
    mode: "REQUIRED" | "OPTIONAL";
    emailDelivery?: EmailDeliveryTypeInput<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForUserId?: (
        userId: string,
        userContext: any
    ) => Promise<
        | {
              status: "OK";
              email: string;
          }
        | {
              status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR";
          }
    >;
    /**
     * @deprecated Please use emailDelivery config instead
     */
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string, userContext: any) => Promise<void>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    mode: "REQUIRED" | "OPTIONAL";
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeEmailVerificationEmailDeliveryInput>;
    getEmailForUserId?: (
        userId: string,
        userContext: any
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
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type User = {
    id: string;
    email: string;
};
export declare type RecipeInterface = {
    createEmailVerificationToken(input: {
        userId: string;
        email: string;
        userContext: any;
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
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    isEmailVerified(input: { userId: string; email: string; userContext: any }): Promise<boolean>;
    revokeEmailVerificationTokens(input: {
        userId: string;
        email: string;
        userContext: any;
    }): Promise<{
        status: "OK";
    }>;
    unverifyEmail(input: {
        userId: string;
        email: string;
        userContext: any;
    }): Promise<{
        status: "OK";
    }>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypeEmailVerificationEmailDeliveryInput>;
};
export declare type APIInterface = {
    verifyEmailPOST:
        | undefined
        | ((input: {
              token: string;
              options: APIOptions;
              userContext: any;
              session?: SessionContainerInterface;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                }
              | {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
                }
              | GeneralErrorResponse
          >);
    isEmailVerifiedGET:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
              session: SessionContainerInterface;
          }) => Promise<
              | {
                    status: "OK";
                    isVerified: boolean;
                }
              | GeneralErrorResponse
          >);
    generateEmailVerifyTokenPOST:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
              session: SessionContainerInterface;
          }) => Promise<
              | {
                    status: "EMAIL_ALREADY_VERIFIED_ERROR" | "OK";
                }
              | GeneralErrorResponse
          >);
};
export declare type TypeEmailVerificationEmailDeliveryInput = {
    type: "EMAIL_VERIFICATION";
    user: {
        id: string;
        email: string;
    };
    emailVerifyLink: string;
};
export declare type GetEmailForUserIdFunc = (
    userId: string,
    userContext: any
) => Promise<
    | {
          status: "OK";
          email: string;
      }
    | {
          status: "EMAIL_DOES_NOT_EXIST_ERROR" | "UNKNOWN_USER_ID_ERROR";
      }
>;
