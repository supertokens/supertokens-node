import { Request, Response, NextFunction } from "express";
import { RecipeImplementation, APIImplementation } from "./";
export declare type TypeInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis?: (originalImplementation: APIImplementation) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
    };
};
export declare type User = {
    id: string;
    email: string;
};
export interface RecipeInterface {
    createEmailVerificationToken(
        userId: string,
        email: string
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "EMAIL_ALREADY_VERIFIED_ERROR";
          }
    >;
    verifyEmailUsingToken(
        token: string
    ): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    isEmailVerified(
        userId: string,
        email: string
    ): Promise<{
        status: "OK";
        isVerified: boolean;
    }>;
}
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: Request;
    res: Response;
    next: NextFunction;
};
export interface APIInterface {
    verifyEmailPOST:
        | undefined
        | ((
              token: string,
              options: APIOptions
          ) => Promise<
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
        | ((
              options: APIOptions
          ) => Promise<{
              status: "OK";
              isVerified: boolean;
          }>);
    generateEmailVerifyTokenPOST:
        | undefined
        | ((
              options: APIOptions
          ) => Promise<{
              status: "EMAIL_ALREADY_VERIFIED_ERROR" | "OK";
          }>);
}
