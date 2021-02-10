import ThirdPartyRecipe from "./recipe";
import ThirdPartyProvider from "./providers";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
export declare type ProviderListFunction = (recipe: ThirdPartyRecipe) => ThirdPartyProvider;
export declare type User = {
    id: string;
    timeJoined: number;
    thirdParty: {
        id: string;
        userId: string;
        email: string;
    };
};
export declare type TypeInputEmailVerificationFeature = {
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
};
export declare type TypeNormalisedInputEmailVerificationFeature = {
    disableDefaultImplementation: boolean;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification: (user: User) => Promise<void>;
};
export declare type TypeInputSignInAndUp = {
    disableDefaultImplementation?: boolean;
    handlePostSignUpIn: (user: User, thirdPartyAuthCodeResponse: any) => Promise<void>;
    providers: ProviderListFunction[];
};
export declare type TypeNormalisedInputSignInAndUp = {
    disableDefaultImplementation: boolean;
    handlePostSignUpIn: (user: User, thirdPartyAuthCodeResponse: any) => Promise<void>;
    providers: ProviderListFunction[];
};
export declare type TypeInputSignOutFeature = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignOutFeature = {
    disableDefaultImplementation: boolean;
};
export declare type TypeInput = {
    signInAndUpFeature: TypeInputSignInAndUp;
    signOutFeature?: TypeInputSignOutFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
};
export declare const InputSchema: {
    type: string;
    properties: {
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
            };
            additionalProperties: boolean;
        };
    };
    required: string[];
    additionalProperties: boolean;
};
export declare type TypeNormalisedInput = {
    signInAndUpFeature: TypeNormalisedInputSignInAndUp;
    signOutFeature: TypeNormalisedInputSignOutFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
};
