// @ts-nocheck
import { RecipeLevelUser } from "./recipe/accountlinking/types";
import RecipeUserId from "./recipeUserId";
import { JSONObject, User as UserType } from "./types";
export declare class LoginMethod implements RecipeLevelUser {
    readonly recipeId: RecipeLevelUser["recipeId"];
    readonly recipeUserId: RecipeUserId;
    readonly tenantIds: string[];
    readonly email?: string;
    readonly phoneNumber?: string;
    readonly thirdParty?: RecipeLevelUser["thirdParty"];
    readonly verified: boolean;
    readonly timeJoined: number;
    constructor(loginMethod: UserWithoutHelperFunctions["loginMethods"][number]);
    hasSameEmailAs(email: string | undefined): boolean;
    hasSamePhoneNumberAs(phoneNumber: string | undefined): boolean;
    hasSameThirdPartyInfoAs(thirdParty?: { id: string; userId: string }): boolean;
    toJson(): JSONObject;
}
export declare class User implements UserType {
    readonly id: string;
    readonly isPrimaryUser: boolean;
    readonly tenantIds: string[];
    readonly emails: string[];
    readonly phoneNumbers: string[];
    readonly thirdParty: {
        id: string;
        userId: string;
    }[];
    readonly loginMethods: LoginMethod[];
    readonly timeJoined: number;
    constructor(user: UserWithoutHelperFunctions);
    toJson(): JSONObject;
}
export declare type UserWithoutHelperFunctions = {
    id: string;
    timeJoined: number;
    isPrimaryUser: boolean;
    emails: string[];
    phoneNumbers: string[];
    tenantIds: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    loginMethods: {
        recipeId: "emailpassword" | "thirdparty" | "passwordless";
        recipeUserId: string;
        tenantIds: string[];
        email?: string;
        phoneNumber?: string;
        thirdParty?: {
            id: string;
            userId: string;
        };
        verified: boolean;
        timeJoined: number;
    }[];
};
