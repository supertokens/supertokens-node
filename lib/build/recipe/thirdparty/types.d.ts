import { Request } from "express";
import {
    RecipeInterface as EmailVerificationRecipeInterface,
    RecipeImplementation as EmailVerificationRecipeImplementation,
} from "../emailverification";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import { RecipeImplementation } from "./";
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
    setJwtPayload?: TypeInputSetJwtPayloadForSession;
    setSessionData?: TypeInputSetSessionDataForSession;
};
export declare type TypeNormalisedInputSessionFeature = {
    setJwtPayload: TypeInputSetJwtPayloadForSession;
    setSessionData: TypeInputSetSessionDataForSession;
};
export declare type TypeInputEmailVerificationFeature = {
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
    override?: {
        functions?: (originalImplementation: EmailVerificationRecipeImplementation) => EmailVerificationRecipeInterface;
    };
};
export declare type TypeInputSignInAndUp = {
    disableDefaultImplementation?: boolean;
    handlePostSignUpIn?: (user: User, thirdPartyAuthCodeResponse: any, newUser: boolean) => Promise<void>;
    providers: TypeProvider[];
};
export declare type TypeNormalisedInputSignInAndUp = {
    disableDefaultImplementation: boolean;
    handlePostSignUpIn: (user: User, thirdPartyAuthCodeResponse: any, newUser: boolean) => Promise<void>;
    providers: TypeProvider[];
};
export declare type TypeInputSignOutFeature = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignOutFeature = {
    disableDefaultImplementation: boolean;
};
export declare type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signInAndUpFeature: TypeInputSignInAndUp;
    signOutFeature?: TypeInputSignOutFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (originalImplementation: RecipeImplementation) => RecipeInterface;
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
                disableDefaultImplementation: {
                    type: string;
                };
                providers: {
                    type: string;
                };
                handlePostSignUpIn: {
                    type: string;
                };
            };
            required: string[];
            additionalProperties: boolean;
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
                override: {
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
    signOutFeature: TypeNormalisedInputSignOutFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
    override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
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
