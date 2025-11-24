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
    readonly webauthn?: RecipeLevelUser["webauthn"];
    readonly verified: boolean;
    readonly timeJoined: number;
    constructor(loginMethod: UserWithoutHelperFunctions["loginMethods"][number]);
    hasSameEmailAs(email: string | undefined): boolean;
    hasSamePhoneNumberAs(phoneNumber: string | undefined): boolean;
    hasSameThirdPartyInfoAs(thirdParty?: { id: string; userId: string }): boolean;
    hasSameWebauthnInfoAs(webauthn?: { credentialId: string }): boolean;
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
    readonly webauthn: {
        credentialIds: string[];
    };
    readonly loginMethods: LoginMethod[];
    readonly timeJoined: number;
    constructor(user: UserWithoutHelperFunctions);
    /**
     * This function is used to create a User object from the API response.
     *
     * @param apiUser - The API response from the user endpoint.
     * @returns A User object.
     */
    static fromApi(
        apiUser: Omit<UserWithoutHelperFunctions, "id"> & {
            id: string;
        }
    ): User;
    toJson(): JSONObject;
}
export type UserWithoutHelperFunctions = {
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
    webauthn: {
        credentialIds: string[];
    };
    loginMethods: {
        recipeId: "emailpassword" | "thirdparty" | "passwordless" | "webauthn";
        recipeUserId: string;
        tenantIds: string[];
        email?: string;
        phoneNumber?: string;
        thirdParty?: {
            id: string;
            userId: string;
        };
        webauthn?: {
            credentialIds: string[];
        };
        verified: boolean;
        timeJoined: number;
    }[];
};
