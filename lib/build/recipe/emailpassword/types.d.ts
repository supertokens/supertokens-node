import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import { TypeInput as EmailDeliveryTypeInput, TypeInputWithService as EmailDeliveryTypeInputWithService } from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo } from "../../types";
export declare type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    getEmailDeliveryConfig: (recipeImpl: RecipeInterface, isInServerlessEnv: boolean) => EmailDeliveryTypeInputWithService<TypeEmailPasswordEmailDeliveryInput>;
    resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature;
    override: {
        functions: (originalImplementation: RecipeInterface, builder?: OverrideableBuilder<RecipeInterface>) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
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
    formFields?: TypeInputFormField[];
};
export declare type NormalisedFormField = {
    id: string;
    validate: (value: any) => Promise<string | undefined>;
    optional: boolean;
};
export declare type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};
export declare type TypeNormalisedInputSignIn = {
    formFields: NormalisedFormField[];
};
export declare type TypeInputResetPasswordUsingTokenFeature = {
    /**
     * @deprecated Please use emailDelivery config instead
     */
    createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string, userContext: any) => Promise<void>;
};
export declare type TypeNormalisedInputResetPasswordUsingTokenFeature = {
    formFieldsForGenerateTokenForm: NormalisedFormField[];
    formFieldsForPasswordResetForm: NormalisedFormField[];
};
export declare type User = {
    id: string;
    recipeUserId: string;
    email: string;
    timeJoined: number;
};
export declare type TypeInput = {
    signUpFeature?: TypeInputSignUp;
    emailDelivery?: EmailDeliveryTypeInput<TypeEmailPasswordEmailDeliveryInput>;
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    override?: {
        functions?: (originalImplementation: RecipeInterface, builder?: OverrideableBuilder<RecipeInterface>) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    signUp(input: {
        email: string;
        password: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        user: User;
    } | {
        status: "EMAIL_ALREADY_EXISTS_ERROR";
    }>;
    signIn(input: {
        email: string;
        password: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        user: User;
    } | {
        status: "WRONG_CREDENTIALS_ERROR";
    }>;
    getUserById(input: {
        userId: string;
        userContext: any;
    }): Promise<User | undefined>;
    getUserByEmail(input: {
        email: string;
        userContext: any;
    }): Promise<User | undefined>;
    /**
     * We do not make email optional here cause we want to
     * allow passing in primaryUserId. If we make email optional,
     * and if the user provides a primaryUserId, then it may result in two problems:
     *  - there is no recipeUserId = input primaryUserId, in this case,
     *    this function will throw an error
     *  - There is a recipe userId = input primaryUserId, but that recipe has no email,
     *    or has wrong email compared to what the user wanted to generate a reset token for.
     *
     * And we want to allow primaryUserId being passed in.
     */
    createResetPasswordToken(input: {
        userId: string;
        email: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        token: string;
    } | {
        status: "UNKNOWN_USER_ID_ERROR";
    }>;
    resetPasswordUsingToken(input: {
        token: string;
        newPassword: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        email: string;
        userId: string;
    } | {
        status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;
    updateEmailOrPassword(input: {
        userId: string;
        email?: string;
        password?: string;
        userContext: any;
    }): Promise<{
        status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
    }>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput>;
};
export declare type APIInterface = {
    emailExistsGET: undefined | ((input: {
        email: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
        exists: boolean;
    } | GeneralErrorResponse>);
    generatePasswordResetTokenPOST: undefined | ((input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
    } | {
        status: "PASSWORD_RESET_NOT_ALLOWED";
        reason: string;
    } | GeneralErrorResponse>);
    passwordResetPOST: undefined | ((input: {
        formFields: {
            id: string;
            value: string;
        }[];
        token: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
        email: string;
        userId: string;
    } | {
        status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    } | GeneralErrorResponse>);
    signInPOST: undefined | ((input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
        user: User;
        session: SessionContainerInterface;
    } | {
        status: "WRONG_CREDENTIALS_ERROR";
    } | GeneralErrorResponse>);
    signUpPOST: undefined | ((input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
        user: User;
        createdNewUser: boolean;
        session: SessionContainerInterface;
    } | {
        status: "EMAIL_ALREADY_EXISTS_ERROR";
    } | {
        status: "SIGNUP_NOT_ALLOWED";
        reason: string;
    } | GeneralErrorResponse>);
    linkAccountToExistingAccountPOST: undefined | ((input: {
        formFields: {
            id: string;
            value: string;
        }[];
        session: SessionContainerInterface;
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
        user: User;
        createdNewRecipeUser: boolean;
        session: SessionContainerInterface;
        wereAccountsAlreadyLinked: boolean;
    } | {
        status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
        primaryUserId: string;
        description: string;
    } | {
        status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
        primaryUserId: string;
        description: string;
    } | {
        status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
        description: string;
    } | {
        status: "ACCOUNT_NOT_VERIFIED_ERROR";
        isNotVerifiedAccountFromInputSession: boolean;
        description: string;
    } | GeneralErrorResponse>);
};
export declare type TypeEmailPasswordPasswordResetEmailDeliveryInput = {
    type: "PASSWORD_RESET";
    user: {
        id: string;
        recipeUserId: string;
        email: string;
    };
    passwordResetLink: string;
};
export declare type TypeEmailPasswordEmailDeliveryInput = TypeEmailPasswordPasswordResetEmailDeliveryInput;
