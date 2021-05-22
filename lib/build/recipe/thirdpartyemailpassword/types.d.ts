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
    disableDefaultImplementation?: boolean;
    formFields?: TypeInputFormField[];
    handlePostSignUp?: TypeInputHandlePostSignUp;
};
export declare type TypeNormalisedInputSignUp = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
    handlePostSignUp: TypeInputHandlePostSignUp;
};
export declare type TypeInputSignIn = {
    disableDefaultImplementation?: boolean;
    handlePostSignIn?: TypeInputHandlePostSignIn;
};
export declare type TypeNormalisedInputSignIn = {
    disableDefaultImplementation: boolean;
    handlePostSignIn: TypeInputHandlePostSignIn;
};
export declare type TypeInputSignOut = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignOut = {
    disableDefaultImplementation: boolean;
};
export declare type TypeInputEmailVerificationFeature = {
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
};
export declare type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    signInFeature?: TypeInputSignIn;
    providers?: TypeProvider[];
    signOutFeature?: TypeInputSignOut;
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
            disableDefaultImplementation: {
                type: string;
            };
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
            disableDefaultImplementation: {
                type: string;
            };
            handlePostSignIn: {
                type: string;
            };
        };
        additionalProperties: boolean;
    };
    providers: {
        type: string;
    };
    signOutFeature: {
        type: string;
        properties: {
            disableDefaultImplementation: {
                type: string;
            };
        };
        additionalProperties: boolean;
    };
    resetPasswordUsingTokenFeature: {
        type: string;
        properties: {
            disableDefaultImplementation: {
                type: string;
            };
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
            disableDefaultImplementation: {
                type: string;
            };
            getEmailVerificationURL: {
                type: string;
            };
            createAndSendCustomEmail: {
                type: string;
            };
            handlePostEmailVerification: {
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
    signOutFeature: TypeNormalisedInputSignOut;
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
    authorisationUrlGET(
        provider: TypeProvider,
        options: ThirdPartyAPIOptions
    ): Promise<{
        status: "OK";
        url: string;
    }>;
    signInUpPOST(
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: ThirdPartyAPIOptions
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    signOutPOST(
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
    }>;
    emailExistsGET(
        email: string,
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
        exists: boolean;
    }>;
    generatePasswordResetTokenPOST(
        formFields: {
            id: string;
            value: string;
        }[],
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
    }>;
    passwordResetPOST(
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
    }>;
    signInPOST(
        formFields: {
            id: string;
            value: string;
        }[],
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }>;
    signUpPOST(
        formFields: {
            id: string;
            value: string;
        }[],
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }>;
}
