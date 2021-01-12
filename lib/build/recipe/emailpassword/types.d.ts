export declare type TypeInput = {
    signUpFeature?: TypeInputSignUp;
    signInFeature?: TypeInputSignIn;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    signOutFeature?: TypeInputSignOutFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
};
export declare type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature;
    signOutFeature: TypeNormalisedInputSignOutFeature;
    emailVerificationFeature: TypeNormalisedInputEmailVerificationFeature;
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
export declare type TypeInputSignUp = {
    disableDefaultImplementation?: boolean;
    formFields?: {
        id: string;
        validate?: (value: any) => Promise<string | undefined>;
        optional?: boolean;
    }[];
    handleCustomFormFieldsPostSignUp?: (user: User, formFields: {
        id: string;
        value: any;
    }[]) => Promise<void>;
};
export declare type TypeInputSignIn = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignUp = {
    disableDefaultImplementation: boolean;
    formFields: NormalisedFormField[];
    handleCustomFormFieldsPostSignUp: (user: User, formFields: {
        id: string;
        value: any;
    }[]) => Promise<void>;
};
export declare type NormalisedFormField = {
    id: string;
    validate: (value: any) => Promise<string | undefined>;
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
    formFieldsForGenerateTokenForm: NormalisedFormField[];
    formFieldsForPasswordResetForm: NormalisedFormField[];
};
export declare type TypeInputSignOutFeature = {
    disableDefaultImplementation?: boolean;
};
export declare type TypeNormalisedInputSignOutFeature = {
    disableDefaultImplementation: boolean;
};
export declare type User = {
    id: string;
    email: string;
    timeJoined: number;
};
export declare type TypeGetUsersQueryParams = {
    limit?: number;
    paginationToken?: string;
    timeJoinedOrder?: "ASC" | "DESC";
};
export declare type TypeGetUsersResponse = {
    users: User[];
    nextPaginationToken?: string;
};
