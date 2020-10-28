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
    handleCustomFormFields?: (user: User, formFields: {
        id: string;
        value: string;
    }[]) => Promise<void>;
};
export declare type TypeInputSignIn = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignUp = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
    handleCustomFormFields: (user: User, formFields: {
        id: string;
        value: string;
    }[]) => Promise<void>;
};
export declare type NormalisedFormField = {
    id: string;
    validate: (value: string) => Promise<string | undefined>;
    optional: boolean;
};
export declare type TypeNormalisedInputSignIn = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
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
    formFields: NormalisedFormField[];
};
export declare type User = {
    id: string;
    email: string;
};
