import { Request, Response, NextFunction } from "express";
import {
    RecipeInterface as EmailVerificationRecipeInterface,
    RecipeImplementation as EmailVerificationRecipeImplementation,
    APIImplementation as EmailVerificationAPIImplementation,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import { TypeInput as TypeInputEmailVerification } from "../emailverification/types";
import { RecipeImplementation, APIImplementation } from "./";
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
            [key: string]: string | ((request: Request) => string);
        };
    };
    getProfileInfo: (authCodeResponse: any) => Promise<UserInfo>;
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
export declare type TypeInputSetJwtPayloadForSession = (
    user: User,
    thirdPartyAuthCodeResponse: any,
    action: "signin" | "signup"
) => Promise<
    | {
          [key: string]: any;
      }
    | undefined
>;
export declare type TypeInputSetSessionDataForSession = (
    user: User,
    thirdPartyAuthCodeResponse: any,
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
    sessionFeature?: TypeInputSessionFeature;
    signInAndUpFeature: TypeInputSignInAndUp;
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
    sessionFeature: TypeNormalisedInputSessionFeature;
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
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
}
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    providers: TypeProvider[];
    req: Request;
    res: Response;
    next: NextFunction;
};
export interface APIInterface {
    authorisationUrlGET:
        | undefined
        | ((
              provider: TypeProvider,
              options: APIOptions
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
              options: APIOptions
          ) => Promise<
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
}
