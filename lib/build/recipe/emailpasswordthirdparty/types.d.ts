import { TypeProvider } from "../thirdparty/types";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import { NormalisedFormField, TypeFormField, TypeInputFormField, TypeInputResetPasswordUsingTokenFeature } from "../emailpassword/types";
export declare type User = {
    id: string;
    timeJoined: number;
    email: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};
export declare type TypeContextEmailPassowrd = {
    loginType: "emailpassword";
    formFields: TypeFormField[];
};
export declare type TypeContextThirdParty = {
    loginType: "thirdparty";
    thirdPartyAuthCodeResponse: any;
};
export declare type TypeInputSetJwtPayloadForSession = (user: User, context: TypeContextEmailPassowrd | TypeContextThirdParty) => Promise<{
    [key: string]: any;
}>;
export declare type TypeInputSetSessionDataForSession = (user: User, context: TypeContextEmailPassowrd | TypeContextThirdParty) => Promise<{
    [key: string]: any;
}>;
export declare type TypeInputHandlePostSignUp = (user: User, context: TypeContextEmailPassowrd | TypeContextThirdParty) => Promise<void>;
export declare type TypeInputHandlePostSignIn = (user: User, context: TypeContextThirdParty) => Promise<void>;
export declare type TypeInputSignUp = {
    disableDefaultImplementation?: boolean;
    formFields?: TypeInputFormField[];
    handlePostSignUp?: TypeInputHandlePostSignUp;
    setJwtPayloadForSession?: TypeInputSetJwtPayloadForSession;
    setSessionDataForSession?: TypeInputSetSessionDataForSession;
};
export declare type TypeNormalisedInputSignUp = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
    handlePostSignUp: TypeInputHandlePostSignUp;
    setJwtPayloadForSession: TypeInputSetJwtPayloadForSession;
    setSessionDataForSession: TypeInputSetSessionDataForSession;
};
export declare type TypeInputSignIn = {
    disableDefaultImplementation?: boolean;
    handlePostSignIn?: TypeInputHandlePostSignIn;
    setJwtPayloadForSession: TypeInputSetJwtPayloadForSession;
    setSessionDataForSession: TypeInputSetSessionDataForSession;
};
export declare type TypeNormalisedInputSignIn = {
    disableDefaultImplementation: boolean;
    handlePostSignIn: TypeInputHandlePostSignIn;
    setJwtPayloadForSession: TypeInputSetJwtPayloadForSession;
    setSessionDataForSession: TypeInputSetSessionDataForSession;
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
    signUpFeature?: TypeInputSignUp;
    signInFeature?: TypeInputSignIn;
    providers?: TypeProvider[];
    signOutFeature?: TypeInputSignOut;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
};
export declare const InputSchema: {
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
            setJwtPayloadForSession: {
                type: string;
            };
            setSessionDataForSession: {
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
            setJwtPayloadForSession: {
                type: string;
            };
            setSessionDataForSession: {
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
};
export declare type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    providers: TypeProvider[];
    signOutFeature: TypeNormalisedInputSignOut;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
};
