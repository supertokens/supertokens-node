import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
export declare type TypeInputSetJwtPayloadForSession = (user: User, formFields: TypeFormField[], action: "signin" | "signup") => Promise<{
    [key: string]: any;
} | undefined>;
export declare type TypeInputSetSessionDataForSession = (user: User, formFields: TypeFormField[], action: "signin" | "signup") => Promise<{
    [key: string]: any;
} | undefined>;
export declare type TypeInputSessionFeature = {
    setJwtPayload?: TypeInputSetJwtPayloadForSession;
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
    signOutFeature: TypeNormalisedInputSignOutFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerification;
};
export declare type TypeInputEmailVerificationFeature = {
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
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
    disableDefaultImplementation?: boolean;
    formFields?: TypeInputFormField[];
    handleCustomFormFieldsPostSignUp?: (user: User, formFields: TypeFormField[]) => Promise<void>;
    handlePostSignUp?: (user: User, formFields: TypeFormField[]) => Promise<void>;
};
export declare type NormalisedFormField = {
    id: string;
    validate: (value: any) => Promise<string | undefined>;
    optional: boolean;
};
export declare type TypeNormalisedInputSignUp = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
    handlePostSignUp: (user: User, formFields: TypeFormField[]) => Promise<void>;
};
export declare type TypeInputSignIn = {
    disableDefaultImplementation?: boolean;
    handlePostSignIn?: (user: User) => Promise<void>;
};
export declare type TypeNormalisedInputSignIn = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
    handlePostSignIn: (user: User) => Promise<void>;
};
export declare type TypeInputSignOutFeature = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignOutFeature = {
    disableDefaultImplementation: boolean;
};
export declare type TypeInputResetPasswordUsingTokenFeature = {
    disableDefaultImplementation?: boolean;
    getResetPasswordURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string) => Promise<void>;
};
export declare const InputResetPasswordUsingTokenFeatureSchema: {
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
export declare type TypeNormalisedInputResetPasswordUsingTokenFeature = {
    disableDefaultImplementation: boolean;
    getResetPasswordURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, passwordResetURLWithToken: string) => Promise<void>;
    formFieldsForGenerateTokenForm: NormalisedFormField[];
    formFieldsForPasswordResetForm: NormalisedFormField[];
};
export declare type TypeNormalisedInputEmailVerificationFeature = {
    disableDefaultImplementation: boolean;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification: (user: User) => Promise<void>;
};
export declare type User = {
    id: string;
    email: string;
    timeJoined: number;
};
export declare type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    signInFeature?: TypeInputSignIn;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    signOutFeature?: TypeInputSignOutFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
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
                handleCustomFormFieldsPostSignUp: {
                    type: string;
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
    additionalProperties: boolean;
};
