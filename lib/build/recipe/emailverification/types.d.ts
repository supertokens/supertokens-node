export declare type TypeInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    disableDefaultImplementation?: boolean;
    getEmailVerificationURL?: (user: User) => Promise<string>;
    createAndSendCustomEmail?: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification?: (user: User) => Promise<void>;
    override?: {
        functions?: (originalImplementation: RecipeInterface) => RecipeInterface;
    };
};
export declare type TypeNormalisedInput = {
    getEmailForUserId: (userId: string) => Promise<string>;
    disableDefaultImplementation: boolean;
    getEmailVerificationURL: (user: User) => Promise<string>;
    createAndSendCustomEmail: (user: User, emailVerificationURLWithToken: string) => Promise<void>;
    handlePostEmailVerification: (user: User) => Promise<void>;
    override: {
        functions: (originalImplementation: RecipeInterface) => RecipeInterface;
    };
};
export declare type User = {
    id: string;
    email: string;
};
export interface RecipeInterface {
    createEmailVerificationToken(userId: string, email: string): Promise<string>;
    verifyEmailUsingToken(token: string): Promise<User>;
    isEmailVerified(userId: string, email: string): Promise<boolean>;
}
