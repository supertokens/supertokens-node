import { RecipeInterface, User } from "../types";
import EmailPasswordImplemenation from "../../emailpassword/recipeImplementation";
import ThirdPartyImplemenation from "../../thirdparty/recipeImplementation";
import { Querier } from "../../../querier";
export default class RecipeImplementation implements RecipeInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation | undefined;
    constructor(emailPasswordQuerier: Querier, thirdPartyQuerier?: Querier);
    signUp: (email: string, password: string) => Promise<User>;
    signIn: (email: string, password: string) => Promise<User>;
    signInUp: (
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: {
            id: string;
            isVerified: boolean;
        }
    ) => Promise<{
        createdNewUser: boolean;
        user: User;
    }>;
    getUserById: (userId: string) => Promise<User | undefined>;
    getUserByThirdPartyInfo: (thirdPartyId: string, thirdPartyUserId: string) => Promise<User | undefined>;
    getEmailForUserId: (userId: string) => Promise<string>;
    getUserByEmail: (email: string) => Promise<User | undefined>;
    createResetPasswordToken: (userId: string) => Promise<string>;
    resetPasswordUsingToken: (token: string, newPassword: string) => Promise<void>;
    getUsersOldestFirst: (
        limit?: number | undefined,
        nextPaginationTokenString?: string | undefined
    ) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUsersNewestFirst: (
        limit?: number | undefined,
        nextPaginationTokenString?: string | undefined
    ) => Promise<{
        users: User[];
        nextPaginationToken?: string | undefined;
    }>;
    getUserCount: () => Promise<number>;
}
