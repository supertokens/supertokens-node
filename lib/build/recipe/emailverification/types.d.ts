// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
export declare type TypeInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
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
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    isEmailVerified(input: { userId: string; email: string }): Promise<boolean>;
    revokeEmailVerificationTokens(input: {
        userId: string;
        email: string;
    }): Promise<{
        status: "OK";
    }>;
    unverifyEmail(input: {
        userId: string;
        email: string;
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
};
export declare type APIInterface = {
    verifyEmailPOST:
        | undefined
        | ((input: {
              token: string;
              options: APIOptions;
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
          }) => Promise<{
              status: "OK";
              isVerified: boolean;
          }>);
    generateEmailVerifyTokenPOST:
        | undefined
        | ((input: {
              options: APIOptions;
          }) => Promise<{
              status: "EMAIL_ALREADY_VERIFIED_ERROR" | "OK";
          }>);
};
