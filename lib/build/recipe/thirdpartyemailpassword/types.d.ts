import { TypeProvider, APIOptions as ThirdPartyAPIOptionsOriginal } from "../thirdparty/types";
import { TypeInput as TypeInputEmailVerification } from "../emailverification/types";
import {
    RecipeInterface as EmailVerificationRecipeInterface,
    APIInterface as EmailVerificationAPIInterface,
} from "../emailverification";
import {
    NormalisedFormField,
    TypeFormField,
    TypeInputFormField,
    TypeInputResetPasswordUsingTokenFeature,
    APIOptions as EmailPasswordAPIOptionsOriginal,
} from "../emailpassword/types";
export declare type User = {
    id: string;
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
export declare type TypeContextEmailPasswordSessionDataAndJWT = {
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
export declare type TypeInputSetJwtPayloadForSession = (
    user: User,
    context: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    action: "signin" | "signup"
) => Promise<
    | {
          [key: string]: any;
      }
    | undefined
>;
export declare type TypeInputSetSessionDataForSession = (
    user: User,
    context: TypeContextEmailPasswordSessionDataAndJWT | TypeContextThirdParty,
    action: "signin" | "signup"
) => Promise<
    | {
          [key: string]: any;
      }
    | undefined
>;
export declare type TypeInputSessionFeature = {
    /**
     * @deprecated Use override functions instead for >= v6.0
     *   */
    setJwtPayload?: TypeInputSetJwtPayloadForSession;
    /**
     * @deprecated Use override functions instead for >= v6.0
     *   */
    setSessionData?: TypeInputSetSessionDataForSession;
};
export declare type TypeNormalisedInputSessionFeature = {
    setJwtPayload: TypeInputSetJwtPayloadForSession;
    setSessionData: TypeInputSetSessionDataForSession;
};
export declare type TypeInputSignUp = {
    formFields?: TypeInputFormField[];
};
export declare type TypeNormalisedInputSignUp = {
    formFields: NormalisedFormField[];
};
export declare type TypeInputEmailVerificationFeature = {
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
};
export declare type TypeInput = {
    sessionFeature?: TypeInputSessionFeature;
    signUpFeature?: TypeInputSignUp;
    providers?: TypeProvider[];
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature?: TypeInputEmailVerificationFeature;
    override?: {
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis?: (originalImplementation: APIInterface) => APIInterface;
        emailVerificationFeature?: {
            functions?: (originalImplementation: EmailVerificationRecipeInterface) => EmailVerificationRecipeInterface;
            apis?: (originalImplementation: EmailVerificationAPIInterface) => EmailVerificationAPIInterface;
        };
    };
};
export declare const InputSchema: {
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
        };
        additionalProperties: boolean;
    };
    providers: {
        type: string;
    };
    resetPasswordUsingTokenFeature: {
        type: string;
        properties: {
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
            getEmailVerificationURL: {
                type: string;
            };
            createAndSendCustomEmail: {
                type: string;
            };
        };
        additionalProperties: boolean;
    };
    override: {
        type: string;
    };
};
export declare type TypeNormalisedInput = {
    sessionFeature: TypeNormalisedInputSessionFeature;
    signUpFeature: TypeNormalisedInputSignUp;
    providers: TypeProvider[];
    resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature;
    emailVerificationFeature: TypeInputEmailVerification;
    override: {
        functions: (originalImplementation: RecipeInterface) => RecipeInterface;
        apis: (originalImplementation: APIInterface) => APIInterface;
        emailVerificationFeature?: {
            functions?: (originalImplementation: EmailVerificationRecipeInterface) => EmailVerificationRecipeInterface;
            apis?: (originalImplementation: EmailVerificationAPIInterface) => EmailVerificationAPIInterface;
        };
    };
};
export interface RecipeInterface {
    getUserById(input: { userId: string }): Promise<User | undefined>;
    getUsersByEmail(input: { email: string }): Promise<User[]>;
    getUserByThirdPartyInfo(input: { thirdPartyId: string; thirdPartyUserId: string }): Promise<User | undefined>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUsersOldestFirst(input: {
        limit?: number;
        nextPaginationToken?: string;
    }): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUsersNewestFirst(input: {
        limit?: number;
        nextPaginationToken?: string;
    }): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }>;
    /**
     * @deprecated Please do not override this function
     *   */
    getUserCount(): Promise<number>;
    signInUp(input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
          }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
    signUp(input: {
        email: string;
        password: string;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    signIn(input: {
        email: string;
        password: string;
    }): Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    /**
     * @deprecated Please do not override this function
     *   */
    getUserByEmail(input: { email: string }): Promise<User | undefined>;
    createResetPasswordToken(input: {
        userId: string;
    }): Promise<
        | {
              status: "OK";
              token: string;
          }
        | {
              status: "UNKNOWN_USER_ID";
          }
    >;
    resetPasswordUsingToken(input: {
        token: string;
        newPassword: string;
    }): Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;
    updateEmailOrPassword(input: {
        userId: string;
        email?: string;
        password?: string;
    }): Promise<{
        status: "OK" | "UNKNOWN_USER_ID" | "EMAIL_ALREADY_EXISTS_ERROR";
    }>;
}
export declare type EmailPasswordAPIOptions = EmailPasswordAPIOptionsOriginal;
export declare type ThirdPartyAPIOptions = ThirdPartyAPIOptionsOriginal;
export declare type SignInUpAPIInput =
    | {
          type: "emailpassword";
          isSignIn: boolean;
          formFields: {
              id: string;
              value: string;
          }[];
          options: EmailPasswordAPIOptions;
      }
    | {
          type: "thirdparty";
          provider: TypeProvider;
          code: string;
          redirectURI: string;
          options: ThirdPartyAPIOptions;
      };
export declare type SignInUpAPIOutput =
    | {
          type: "emailpassword";
          status: "OK";
          user: User;
          createdNewUser: boolean;
      }
    | {
          type: "emailpassword";
          status: "WRONG_CREDENTIALS_ERROR" | "EMAIL_ALREADY_EXISTS_ERROR";
      }
    | {
          type: "thirdparty";
          status: "OK";
          createdNewUser: boolean;
          user: User;
          authCodeResponse: any;
      }
    | {
          type: "thirdparty";
          status: "NO_EMAIL_GIVEN_BY_PROVIDER";
      }
    | {
          type: "thirdparty";
          status: "FIELD_ERROR";
          error: string;
      };
export interface APIInterface {
    authorisationUrlGET:
        | undefined
        | ((input: {
              provider: TypeProvider;
              options: ThirdPartyAPIOptions;
          }) => Promise<{
              status: "OK";
              url: string;
          }>);
    emailExistsGET:
        | undefined
        | ((input: {
              email: string;
              options: EmailPasswordAPIOptions;
          }) => Promise<{
              status: "OK";
              exists: boolean;
          }>);
    generatePasswordResetTokenPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              options: EmailPasswordAPIOptions;
          }) => Promise<{
              status: "OK";
          }>);
    passwordResetPOST:
        | undefined
        | ((input: {
              formFields: {
                  id: string;
                  value: string;
              }[];
              token: string;
              options: EmailPasswordAPIOptions;
          }) => Promise<{
              status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
          }>);
    signInUpPOST: undefined | ((input: SignInUpAPIInput) => Promise<SignInUpAPIOutput>);
}
