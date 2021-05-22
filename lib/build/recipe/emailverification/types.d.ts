import { Request, Response, NextFunction } from "express";
import { RecipeImplementation, APIImplementation } from "./";
export declare type TypeInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis?: (originalImplementation: APIImplementation) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    disableDefaultImplementation: boolean;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification: (user: User) => Promise<void>;
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
    createEmailVerificationToken(userId: string, email: string): Promise<string>;
    verifyEmailUsingToken(token: string): Promise<User>;
    isEmailVerified(userId: string, email: string): Promise<boolean>;
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
    verifyEmailPOST(
        token: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
    }>;
    isEmailVerifiedGET(
        options: APIOptions
    ): Promise<{
        status: "OK";
        isVerified: boolean;
    }>;
    generateEmailVerifyTokenPOST(
        options: APIOptions
    ): Promise<{
        status: "OK";
    }>;
}
