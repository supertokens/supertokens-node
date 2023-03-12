// @ts-nocheck
import { TypeProvider, APIOptions as ThirdPartyAPIOptionsOriginal } from "../thirdparty/types";
import {
    NormalisedFormField,
    TypeFormField,
    TypeInputFormField,
    APIOptions as EmailPasswordAPIOptionsOriginal,
    TypeEmailPasswordEmailDeliveryInput,
    RecipeInterface as EPRecipeInterface,
} from "../emailpassword/types";
import OverrideableBuilder from "supertokens-js-override";
import { SessionContainerInterface } from "../session/types";
import {
    TypeInput as EmailDeliveryTypeInput,
    TypeInputWithService as EmailDeliveryTypeInputWithService,
} from "../../ingredients/emaildelivery/types";
import { GeneralErrorResponse, User as GlobalUser } from "../../types";
export declare type User = {
    id: string;
    recipeUserId: string;
    timeJoined: number;
    email: string;
    thirdParty?: {
        id: string;
        userId: string;
    };
};
export declare type TypeContextEmailPasswordSignUp = {
    loginType: "emailpassword";
    formFields: TypeFormField[];
};
export declare type TypeContextEmailPasswordSignIn = {
    loginType: "emailpassword";
};
export declare type TypeContextThirdParty = {
    loginType: "thirdparty";
    thirdPartyAuthCodeResponse: any;
};
export declare type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};
export declare type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};
export declare type TypeInput = {
    signUpFeature?: TypeInputSignUp;
    providers?: TypeProvider[];
    emailDelivery?: EmailDeliveryTypeInput<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    signUpFeature: TypeNormalisedInputSignUp;
    providers: TypeProvider[];
    getEmailDeliveryConfig: (
        emailPasswordRecipeImpl: EPRecipeInterface,
        isInServerlessEnv: boolean
    ) => EmailDeliveryTypeInputWithService<TypeThirdPartyEmailPasswordEmailDeliveryInput>;
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getUserById(input: { userId: string; userContext: any }): Promise<GlobalUser | User | undefined>;
    getUsersByEmail(input: { email: string; userContext: any }): Promise<(User | GlobalUser)[]>;
    getUserByThirdPartyInfo(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        userContext: any;
    }): Promise<User | undefined>;
    thirdPartySignInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: string;
        userContext: any;
    }): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    emailPasswordSignUp(input: {
        email: string;
        password: string;
        doAccountLinking: boolean;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: GlobalUser;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    emailPasswordSignIn(input: {
        email: string;
        password: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              user: GlobalUser;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    createResetPasswordToken(input: {
        userId: string;
        email: string;
        userContext: any;
    }): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID_ERROR";
          }
    >;
    resetPasswordUsingToken(input: {
        token: string;
        newPassword: string;
        userContext: any;
    }): Promise<
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
        userId: string;
        email?: string;
        password?: string;
        userContext: any;
    }): Promise<{
        status:
            | "OK"
            | "UNKNOWN_USER_ID_ERROR"
            | "EMAIL_ALREADY_EXISTS_ERROR"
            | "EMAIL_CHANGE_NOT_ALLOWED_DUE_TO_ACCOUNT_LINKING";
    }>;
};
export declare type EmailPasswordAPIOptions = EmailPasswordAPIOptionsOriginal;
export declare type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export declare type APIInterface = {
    linkThirdPartyAccountToExistingAccountPOST:
        | undefined
        | ((input: {
              provider: TypeProvider;
              code: string;
              redirectURI: string;
              authCodeResponse?: any;
              clientId?: string;
              session: SessionContainerInterface;
              options: ThirdPartyAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: User;
                    createdNewRecipeUser: boolean;
                    session: SessionContainerInterface;
                    wereAccountsAlreadyLinked: boolean;
                    authCodeResponse: any;
                }
              | {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                    primaryUserId: string;
                    description: string;
                }
              | {
                    status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                    primaryUserId: string;
                    description: string;
                }
              | {
                    status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
                    description: string;
                }
              | {
                    status: "ACCOUNT_NOT_VERIFIED_ERROR";
                    isNotVerifiedAccountFromInputSession: boolean;
                    description: string;
                }
              | GeneralErrorResponse
          >);
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              options: ThirdPartyAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    url: string;
                }
              | GeneralErrorResponse
          >);
    emailPasswordEmailExistsGET:
        | undefined
        | ((input: {
              email: string;
              options: EmailPasswordAPIOptions;
              userContext: any;
          }) => Promise<
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
                  value: string;
              }[];
              options: EmailPasswordAPIOptions;
              userContext: any;
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
                  value: string;
              }[];
              token: string;
              options: EmailPasswordAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    email: string;
                    userId: string;
                }
              | {
                    status: "RESET_PASSWORD_INVALID_TOKEN_ERROR";
                }
              | GeneralErrorResponse
          >);
    thirdPartySignInUpPOST:
        | undefined
        | ((input: {
              provider: TypeProvider;
              code: string;
              redirectURI: string;
              authCodeResponse?: any;
              clientId?: string;
              options: ThirdPartyAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    createdNewUser: boolean;
                    createdNewRecipeUser: boolean;
                    user: User;
                    session: SessionContainerInterface;
                    authCodeResponse: any;
                }
              | GeneralErrorResponse
              | {
                    status: "NO_EMAIL_GIVEN_BY_PROVIDER";
                }
              | {
                    status: "SIGNUP_NOT_ALLOWED";
                    reason: string;
                }
              | {
                    status: "SIGNIN_NOT_ALLOWED";
                    primaryUserId: string;
                    description: string;
                }
          >);
    linkEmailPasswordAccountToExistingAccountPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              session: SessionContainerInterface;
              options: EmailPasswordAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: GlobalUser;
                    createdNewRecipeUser: boolean;
                    session: SessionContainerInterface;
                    wereAccountsAlreadyLinked: boolean;
                }
              | {
                    status: "RECIPE_USER_ID_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                    primaryUserId: string;
                    description: string;
                }
              | {
                    status: "ACCOUNT_INFO_ALREADY_LINKED_WITH_ANOTHER_PRIMARY_USER_ID_ERROR";
                    primaryUserId: string;
                    description: string;
                }
              | {
                    status: "ACCOUNT_LINKING_NOT_ALLOWED_ERROR";
                    description: string;
                }
              | {
                    status: "ACCOUNT_NOT_VERIFIED_ERROR";
                    isNotVerifiedAccountFromInputSession: boolean;
                    description: string;
                }
              | GeneralErrorResponse
          >);
    emailPasswordSignInPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: EmailPasswordAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: GlobalUser;
                    session: SessionContainerInterface;
                }
              | {
                    status: "WRONG_CREDENTIALS_ERROR";
                }
              | GeneralErrorResponse
          >);
    emailPasswordSignUpPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: EmailPasswordAPIOptions;
              userContext: any;
          }) => Promise<
              | {
                    status: "OK";
                    user: GlobalUser;
                    createdNewUser: boolean;
                    session: SessionContainerInterface;
                }
              | {
                    status: "EMAIL_ALREADY_EXISTS_ERROR";
                }
              | {
                    status: "SIGNUP_NOT_ALLOWED";
                    reason: string;
                }
              | GeneralErrorResponse
          >);
    appleRedirectHandlerPOST:
        | undefined
        | ((input: { code: string; state: string; options: ThirdPartyAPIOptions; userContext: any }) => Promise<void>);
};
export declare type TypeThirdPartyEmailPasswordEmailDeliveryInput = TypeEmailPasswordEmailDeliveryInput;
