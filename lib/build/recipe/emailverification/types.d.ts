// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { TypeConfigInput as EmailDeliveryConfigInput } from "../emaildelivery/types";
import EmailDeliveryRecipe from "../emaildelivery/recipe";
export declare type TypeInput = {
    emailDelivery?: EmailDeliveryConfigInput<TypeEmailDeliveryTypeInput>;
    getEmailForUserId: (userId: string, userContext: any) => Promise<string>;
    getEmailVerificationURL?: (user: User, userContext: any) => Promise<string>;
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
    emailDelivery: EmailDeliveryConfigInput<TypeEmailDeliveryTypeInput>;
    getEmailForUserId: (userId: string, userContext: any) => Promise<string>;
    getEmailVerificationURL: (user: User, userContext: any) => Promise<string>;
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
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryRecipe<TypeEmailDeliveryTypeInput>;
};
export declare type APIInterface = {
    verifyEmailPOST:
        | undefined
        | ((input: {
              token: string;
              options: APIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                }
              | {
                    status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
                }
          >);
    isEmailVerifiedGET:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
          }) => Promise<{
              status: "OK";
              isVerified: boolean;
          }>);
    generateEmailVerifyTokenPOST:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: any;
          }) => Promise<{
              status: "EMAIL_ALREADY_VERIFIED_ERROR" | "OK";
          }>);
};
export declare type TypeEmailDeliveryTypeInput = {
    type: "EMAIL_VERIFICATION";
    user: User;
    emailVerifyLink: string;
};
