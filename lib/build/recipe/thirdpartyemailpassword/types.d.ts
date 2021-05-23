import { TypeProvider, APIOptions as ThirdPartyAPIOptionsOriginal } from "../thirdparty/types";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import {
    RecipeImplementation as EmailVerificationRecipeImplementation,
    RecipeInterface as EmailVerificationRecipeInterface,
    APIImplementation as EmailVerificationAPIImplementation,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import {
    NormalisedFormField,
    TypeFormField,
    TypeInputFormField,
    TypeInputResetPasswordUsingTokenFeature,
    APIOptions as EmailPasswordAPIOptionsOriginal,
} from "../emailpassword/types";
import { RecipeImplementation, APIImplementation } from "./";
export declare type User = {
    id: string;
    timeJoined: number;
    email: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};
export declare type TypeContextEmailPasswordSignUp = {
    loginType: "emailpassword";
    formFields: TypeFormField[];
};
export declare type TypeContextEmailPasswordSessionDataAndJWT = {
    loginType: "emailpassword";
    formFields: TypeFormField[];
};
export declare type TypeContextEmailPasswordSignIn = {
    loginType: "emailpassword";
};
export declare type TypeContextThirdParty = {
    loginType: "thirdparty";
    thirdPartyAuthCodeResponse: any;
};
export declare type TypeInputHandlePostSignUp = (
    user: User,
    context: TypeContextEmailPasswordSignUp | TypeContextThirdParty
) => Promise<void>;
export declare type TypeInputHandlePostSignIn = (
    user: User,
    context: TypeContextEmailPasswordSignIn | TypeContextThirdParty
) => Promise<void>;
export declare type TypeInputSetJwtPayloadForSession = (
    user: User,
    context: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    action: "signin" | "signup"
) => Promise<
    | {
          [key: string]: any;
      }
    | undefined
>;
export declare type TypeInputSetSessionDataForSession = (
    user: User,
    context: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    action: "signin" | "signup"
) => Promise<
    | {
          [key: string]: any;
      }
    | undefined
>;
export declare type TypeInputSessionFeature = {
    setJwtPayload?: TypeInputSetJwtPayloadForSession;
    setSessionData?: TypeInputSetSessionDataForSession;
};
export declare type TypeNormalisedInputSessionFeature = {
    setJwtPayload: TypeInputSetJwtPayloadForSession;
    setSessionData: TypeInputSetSessionDataForSession;
};
export declare type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
    handlePostSignUp?: TypeInputHandlePostSignUp;
};
export declare type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
    handlePostSignUp: TypeInputHandlePostSignUp;
};
export declare type TypeInputSignIn = {
    handlePostSignIn?: TypeInputHandlePostSignIn;
};
export declare type TypeNormalisedInputSignIn = {
    handlePostSignIn: TypeInputHandlePostSignIn;
};
export declare type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
};
export declare type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    signInFeature?: TypeInputSignIn;
    providers?: TypeProvider[];
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
            handlePostSignUp: {
                type: string;
            };
        };
        additionalProperties: boolean;
    };
    signInFeature: {
        type: string;
        properties: {
            handlePostSignIn: {
                type: string;
            };
        };
        additionalProperties: boolean;
    };
    providers: {
        type: string;
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
export declare type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    providers: TypeProvider[];
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
    };
};
export interface RecipeInterface {
    getUserById(userId: string): Promise<User | undefined>;
    getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string): Promise<User | undefined>;
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
    signInUp(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ): Promise<{
        createdNewUser: boolean;
        user: User;
    }>;
    signUp(email: string, password: string): Promise<User>;
    signIn(email: string, password: string): Promise<User>;
    getUserByEmail(email: string): Promise<User | undefined>;
    createResetPasswordToken(userId: string): Promise<string>;
    resetPasswordUsingToken(token: string, newPassword: string): Promise<void>;
}
export declare type EmailPasswordAPIOptions = EmailPasswordAPIOptionsOriginal;
export declare type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export interface APIInterface {
    authorisationUrlGET:
        | undefined
        | ((
              provider: TypeProvider,
              options: ThirdPartyAPIOptions
          ) => Promise<{
              status: "OK";
              url: string;
          }>);
    signInUpPOST:
        | undefined
        | ((
              provider: TypeProvider,
              code: string,
              redirectURI: string,
              options: ThirdPartyAPIOptions
          ) => Promise<{
              status: "OK";
              createdNewUser: boolean;
              user: User;
          }>);
    signOutPOST:
        | undefined
        | ((
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
          }>);
    emailExistsGET:
        | undefined
        | ((
              email: string,
              options: EmailPasswordAPIOptions
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
              options: EmailPasswordAPIOptions
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
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
          }>);
    signInPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
              user: User;
          }>);
    signUpPOST:
        | undefined
        | ((
              formFields: {
                  id: string;
                  value: string;
              }[],
              options: EmailPasswordAPIOptions
          ) => Promise<{
              status: "OK";
              user: User;
          }>);
}
