// @ts-nocheck
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import EmailDeliveryIngredient from "../../ingredients/emaildelivery";
import { GeneralErrorResponse, NormalisedAppinfo, User, UserContext } from "../../types";
import RecipeUserId from "../../recipeUserId";
export type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    signInFeature: TypeNormalisedInputSignIn;
    getEmailDeliveryConfig: (
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeEmailPasswordEmailDeliveryInput>;
    resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeInputFormField = {
    id: string;
    validate?: (value: any, tenantId: string, userContext: UserContext) => Promise<string | undefined>;
    optional?: boolean;
};
export type TypeFormField = {
    id: string;
    value: any;
};
export type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};
export type NormalisedFormField = {
    id: string;
    validate: (value: any, tenantId: string, userContext: UserContext) => Promise<string | undefined>;
    optional: boolean;
};
export type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};
export type TypeNormalisedInputSignIn = {
    formFields: NormalisedFormField[];
};
export type TypeNormalisedInputResetPasswordUsingTokenFeature = {
    formFieldsForGenerateTokenForm: NormalisedFormField[];
    formFieldsForPasswordResetForm: NormalisedFormField[];
};
export type TypeInput = {
    signUpFeature?: TypeInputSignUp;
    emailDelivery?: EmailDeliveryTypeInput<TypeEmailPasswordEmailDeliveryInput>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type RecipeInterface = {
    signUp(input: {
        email: string;
        password: string;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    createNewRecipeUser(input: {
        email: string;
        password: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    signIn(input: {
        email: string;
        password: string;
        session: SessionContainerInterface | undefined;
        shouldTryLinkingWithSessionUser: boolean | undefined;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
        | {
              status: "LINKING_TO_SESSION_USER_FAILED";
              reason:
                  | "EMAIL_VERIFICATION_REQUIRED"
                  | "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR"
                  | "SESSION_USER_ACCOUNT_INFO_ALREADY_ASSOCIATED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
          }
    >;
    verifyCredentials(input: { email: string; password: string; tenantId: string; userContext: UserContext }): Promise<
        | {
              status: "OK";
              user: User;
              recipeUserId: RecipeUserId;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    /**
     * We pass in the email as well to this function cause the input userId
     * may not be associated with an emailpassword account. In this case, we
     * need to know which email to use to create an emailpassword account later on.
     */
    createResetPasswordToken(input: {
        userId: string;
        email: string;
        tenantId: string;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    consumePasswordResetToken(input: { token: string; tenantId: string; userContext: UserContext }): Promise<
        | {
              status: "OK";
              email: string;
              userId: string;
          }
        | {
              status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }
    >;
    updateEmailOrPassword(input: {
        recipeUserId: RecipeUserId;
        email?: string;
        password?: string;
        userContext: UserContext;
        applyPasswordPolicy?: boolean;
        tenantIdForPasswordPolicy: string;
    }): Promise<
        | {
              status: "OK" | "UNKNOWN_USER_ID_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
          }
        | {
              status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
              reason: string;
          }
        | {
              status: "PASSWORD_POLICY_VIOLATED_ERROR";
              failureReason: string;
          }
    >;
};
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
    emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput>;
};
export type APIInterface = {
    emailExistsGET:
        | undefined
        | ((input: { email: string; tenantId: string; options: APIOptions; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                    exists: boolean;
                }
              | GeneralErrorResponse
          >);
    generatePasswordResetTokenPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: unknown;
              }[];
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                }
              | {
                    status: "PASSWORD_RESET_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);
    passwordResetPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: unknown;
              }[];
              token: string;
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    email: string;
                    user: User;
                }
              | {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
                }
              | {
                    status: "PASSWORD_POLICY_VIOLATED_ERROR";
                    failureReason: string;
                }
              | GeneralErrorResponse
          >);
    signInPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: unknown;
              }[];
              tenantId: string;
              session: SessionContainerInterface | undefined;
              shouldTryLinkingWithSessionUser: boolean | undefined;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "SIGN_IN_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
              | GeneralErrorResponse
          >);
    signUpPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: unknown;
              }[];
              tenantId: string;
              session: SessionContainerInterface | undefined;
              shouldTryLinkingWithSessionUser: boolean | undefined;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    session: SessionContainerInterface;
                }
              | {
                    status: "SIGN_UP_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | GeneralErrorResponse
          >);
};
export type TypeEmailPasswordPasswordResetEmailDeliveryInput = {
    type: "PASSWORD_RESET";
    user: {
        id: string;
        recipeUserId: RecipeUserId | undefined;
        email: string;
    };
    passwordResetLink: string;
    tenantId: string;
};
export type TypeEmailPasswordEmailDeliveryInput = TypeEmailPasswordPasswordResetEmailDeliveryInput;
