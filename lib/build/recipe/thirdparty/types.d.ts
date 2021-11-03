// @ts-nocheck
import {
    RecipeInterface as EmailVerificationRecipeInterface,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import { TypeInput as TypeInputEmailVerification } from "../emailverification/types";
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "../../override";
export declare type UserInfo = {
    id: string;
    email?: {
        id: string;
        isVerified: boolean;
    };
};
export declare type TypeProviderGetResponse = {
    accessTokenAPI: {
        url: string;
        params: {
            [key: string]: string;
        };
    };
    authorisationRedirect: {
        url: string;
        params: {
            [key: string]: string | ((request: any) => string);
        };
    };
    getProfileInfo: (authCodeResponse: any) => Promise<UserInfo>;
    getClientId: () => string;
};
export declare type TypeProvider = {
    id: string;
    get: (redirectURI: string | undefined, authCodeFromRequest: string | undefined) => Promise<TypeProviderGetResponse>;
};
export declare type User = {
    id: string;
    timeJoined: number;
    email: string;
    thirdParty: {
        id: string;
        userId: string;
    };
};
export declare type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
};
export declare type TypeInputSignInAndUp = {
    providers: TypeProvider[];
};
export declare type TypeNormalisedInputSignInAndUp = {
    providers: TypeProvider[];
};
export declare type TypeInput = {
    signInAndUpFeature: TypeInputSignInAndUp;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        emailVerificationFeature?: {
            functions?: (
                originalImplementation: EmailVerificationRecipeInterface,
                builder?: OverrideableBuilder<EmailVerificationRecipeInterface>
            ) => EmailVerificationRecipeInterface;
            apis?: (
                originalImplementation: EmailVerificationAPIInterface,
                builder?: OverrideableBuilder<EmailVerificationAPIInterface>
            ) => EmailVerificationAPIInterface;
        };
    };
};
export declare const InputSchema: {
    type: string;
    properties: {
        signInAndUpFeature: {
            type: string;
            properties: {
                providers: {
                    type: string;
                };
            };
            required: string[];
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
    required: string[];
    additionalProperties: boolean;
};
export declare type TypeNormalisedInput = {
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
    emailVerificationFeature: TypeInputEmailVerification;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
        emailVerificationFeature?: {
            functions?: (
                originalImplementation: EmailVerificationRecipeInterface,
                builder?: OverrideableBuilder<EmailVerificationRecipeInterface>
            ) => EmailVerificationRecipeInterface;
            apis?: (
                originalImplementation: EmailVerificationAPIInterface,
                builder?: OverrideableBuilder<EmailVerificationAPIInterface>
            ) => EmailVerificationAPIInterface;
        };
    };
};
export declare type RecipeInterface = {
    getUserById(input: { userId: string }): Promise<User | undefined>;
    getUsersByEmail(input: { email: string }): Promise<User[]>;
    getUserByThirdPartyInfo(input: { thirdPartyId: string; thirdPartyUserId: string }): Promise<User | undefined>;
    signInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
          }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    emailVerificationRecipeImplementation: EmailVerificationRecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    providers: TypeProvider[];
    req: BaseRequest;
    res: BaseResponse;
};
export declare type APIInterface = {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              options: APIOptions;
          }) => Promise<{
              status: "OK";
              url: string;
          }>);
    signInUpPOST:
        | undefined
        | ((input: {
              provider: TypeProvider;
              code: string;
              redirectURI: string;
              authCodeResponse?: any;
              options: APIOptions;
          }) => Promise<
              | {
                    status: "OK";
                    createdNewUser: boolean;
                    user: User;
                    authCodeResponse: any;
                }
              | {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER";
                }
              | {
                    status: "FIELD_ERROR";
                    error: string;
                }
          >);
};
