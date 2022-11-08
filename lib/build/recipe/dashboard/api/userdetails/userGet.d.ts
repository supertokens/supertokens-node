// @ts-nocheck
import { APIFunction } from "../../types";
declare type CommonUserInformation = {
    id: string;
    timeJoined: number;
    firstName: string;
    lastName: string;
};
export declare type EmailPasswordUser = CommonUserInformation & {
    email: string;
};
export declare type ThirdPartyUser = CommonUserInformation & {
    email: string;
    thirdParty: {
        id: string;
        userId: string;
    };
};
export declare type PasswordlessUser = CommonUserInformation & {
    email?: string;
    phone?: string;
};
export declare function getUserForRecipeId(
    userId: string,
    recipeId: string
): Promise<{
    user: EmailPasswordUser | ThirdPartyUser | PasswordlessUser | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}>;
export declare const userGet: APIFunction;
export {};
