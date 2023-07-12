// @ts-nocheck
import Recipe from "./recipe";
import SuperTokensError from "./error";
import { RecipeInterface, User, APIInterface, APIOptions, TypeProvider } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static getProvider(
        thirdPartyId: string,
        clientType: string | undefined,
        tenantId?: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        provider: TypeProvider;
    }>;
    static manuallyCreateOrUpdateUser(
        thirdPartyId: string,
        thirdPartyUserId: string,
        email: string,
        tenantId?: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    static getUserById(userId: string, userContext?: any): Promise<User | undefined>;
    static getUsersByEmail(email: string, tenantId?: string, userContext?: any): Promise<User[]>;
    static getUserByThirdPartyInfo(
        thirdPartyId: string,
        thirdPartyUserId: string,
        tenantId?: string,
        userContext?: any
    ): Promise<User | undefined>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let getProvider: typeof Wrapper.getProvider;
export declare let manuallyCreateOrUpdateUser: typeof Wrapper.manuallyCreateOrUpdateUser;
export declare let getUserById: typeof Wrapper.getUserById;
export declare let getUsersByEmail: typeof Wrapper.getUsersByEmail;
export declare let getUserByThirdPartyInfo: typeof Wrapper.getUserByThirdPartyInfo;
export type { RecipeInterface, User, APIInterface, APIOptions, TypeProvider };
