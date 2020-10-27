export declare type TypeInput = {
    signUpFeature?: TypeInputSignUp;
    signInFeature?: TypeInputSignIn;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
};
export declare type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature;
};
export declare type TypeInputSignUp = {
    disableDefaultImplementation?: boolean;
    formFields?: {
        id: string;
        validate?: (value: string) => Promise<string | undefined>;
        optional?: boolean;
    }[];
    postSignUpCallback?: (user: User, formFields: {
        id: string;
        value: string;
    }) => Promise<void>;
};
export declare type TypeInputSignIn = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignUp = {
    disableDefaultImplementation: boolean;
    formFields: {
        id: string;
        validate: (value: string) => Promise<string | undefined>;
        optional: boolean;
    }[];
    postSignUpCallback: (user: User, formFields: {
        id: string;
        value: string;
    }) => Promise<void>;
};
export declare type TypeNormalisedInputSignIn = {
    disableDefaultImplementation: boolean;
    formFields: {
        id: "email" | "password";
        validate: (value: string) => Promise<string | undefined>;
    }[];
};
export declare type TypeInputResetPasswordUsingTokenFeature = {
    disableDefaultImplementation?: boolean;
    getResetPasswordURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string) => Promise<void>;
};
export declare type TypeNormalisedInputResetPasswordUsingTokenFeature = {
    disableDefaultImplementation: boolean;
    getResetPasswordURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, passwordResetURLWithToken: string) => Promise<void>;
    formFields: {
        id: "password";
        validate: (value: string) => Promise<string | undefined>;
    }[];
};
export declare type User = {
    id: string;
    email: string;
};
