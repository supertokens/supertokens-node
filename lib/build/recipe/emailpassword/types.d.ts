import {
    RecipeInterface as EmailVerificationRecipeInterface,
    RecipeImplementation as EmailVerificationRecipeImplementation,
    APIImplementation as EmailVerificationAPIImplementation,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import { TypeInput as TypeInputEmailVerification } from "../emailverification/types";
import { RecipeImplementation, APIImplementation } from "./";
import { Request, Response, NextFunction } from "express";
export declare type TypeInputSetJwtPayloadForSession = (
    user: User,
    formFields: TypeFormField[],
    action: "signin" | "signup"
) => Promise<
    | {
          [key: string]: any;
      }
    | undefined
>;
export declare type TypeInputSetSessionDataForSession = (
    user: User,
    formFields: TypeFormField[],
    action: "signin" | "signup"
) => Promise<
    | {
          [key: string]: any;
      }
    | undefined
>;
export declare type TypeInputSessionFeature = {
    /**
     * @deprecated Use override functions instead for >= v6.0
     *   */
    setJwtPayload?: TypeInputSetJwtPayloadForSession;
    /**
     * @deprecated Use override functions instead for >= v6.0
     *   */
    setSessionData?: TypeInputSetSessionDataForSession;
};
export declare type TypeNormalisedInputSessionFeature = {
    setJwtPayload: TypeInputSetJwtPayloadForSession;
    setSessionData: TypeInputSetSessionDataForSession;
};
export declare type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature;
    emailVerificationFeature: TypeInputEmailVerification;
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
        emailVerificationFeature?: {
            functions?: (
                originalImplementation: EmailVerificationRecipeImplementation
            ) => EmailVerificationRecipeInterface;
            apis?: (originalImplementation: EmailVerificationAPIImplementation) => EmailVerificationAPIInterface;
        };
    };
};
export declare type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
};
export declare type TypeInputFormField = {
    id: string;
    validate?: (value: any) => Promise<string | undefined>;
    optional?: boolean;
};
export declare type TypeFormField = {
    id: string;
    value: any;
};
export declare type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};
export declare type NormalisedFormField = {
    id: string;
    validate: (value: any) => Promise<string | undefined>;
    optional: boolean;
};
export declare type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};
export declare type TypeNormalisedInputSignIn = {
    formFields: NormalisedFormField[];
};
export declare type TypeInputResetPasswordUsingTokenFeature = {
    getResetPasswordURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string) => Promise<void>;
};
export declare const InputResetPasswordUsingTokenFeatureSchema: {
    type: string;
    properties: {
        getResetPasswordURL: {
            type: string;
        };
        createAndSendCustomEmail: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export declare type TypeNormalisedInputResetPasswordUsingTokenFeature = {
    getResetPasswordURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, passwordResetURLWithToken: string) => Promise<void>;
    formFieldsForGenerateTokenForm: NormalisedFormField[];
    formFieldsForPasswordResetForm: NormalisedFormField[];
};
export declare type User = {
    id: string;
    email: string;
    timeJoined: number;
};
export declare type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis?: (originalImplementation: APIImplementation) => APIInterface;
        emailVerificationFeature?: {
            functions?: (
                originalImplementation: EmailVerificationRecipeImplementation
            ) => EmailVerificationRecipeInterface;
            apis?: (originalImplementation: EmailVerificationAPIImplementation) => EmailVerificationAPIInterface;
        };
    };
};
export declare const InputSchema: {
    type: string;
    properties: {
        sessionFeature: {
            type: string;
            properties: {
                setJwtPayload: {
                    type: string;
                };
                setSessionData: {
                    type: string;
                };
            };
            additionalProperties: boolean;
        };
        signUpFeature: {
            type: string;
            properties: {
                formFields: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            id: {
                                type: string;
                            };
                            validate: {
                                type: string;
                            };
                            optional: {
                                type: string;
                            };
                        };
                        required: string[];
                        additionalProperties: boolean;
                    };
                };
            };
            additionalProperties: boolean;
        };
        resetPasswordUsingTokenFeature: {
            type: string;
            properties: {
                getResetPasswordURL: {
                    type: string;
                };
                createAndSendCustomEmail: {
                    type: string;
                };
            };
            additionalProperties: boolean;
        };
        emailVerificationFeature: {
            type: string;
            properties: {
                getEmailVerificationURL: {
                    type: string;
                };
                createAndSendCustomEmail: {
                    type: string;
                };
            };
            additionalProperties: boolean;
        };
        override: {
            type: string;
        };
    };
    additionalProperties: boolean;
};
export interface RecipeInterface {
    signUp(
        email: string,
        password: string
    ): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    signIn(
        email: string,
        password: string
    ): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    getUserById(userId: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    createResetPasswordToken(
        userId: string
    ): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID";
          }
    >;
    resetPasswordUsingToken(
        token: string,
        newPassword: string
    ): Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;
    getUsersOldestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    getUsersNewestFirst(
        limit?: number,
        nextPaginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    getUserCount(): Promise<number>;
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
    emailExistsGET:
        | undefined
        | ((
              email: string,
              options: APIOptions
          ) => Promise<{
              status: "OK";
              exists: boolean;
          }>);
    generatePasswordResetTokenPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              options: APIOptions
          ) => Promise<{
              status: "OK";
          }>);
    passwordResetPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              token: string,
              options: APIOptions
          ) => Promise<{
              status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }>);
    signInPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              options: APIOptions
          ) => Promise<
              | {
                    status: "OK";
                    user: User;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
          >);
    signUpPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              options: APIOptions
          ) => Promise<
              | {
                    status: "OK";
                    user: User;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
          >);
}
