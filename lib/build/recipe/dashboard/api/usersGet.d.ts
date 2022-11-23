// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
declare type User = {
    id: string;
    isPrimaryUser: boolean;
    firstName?: string;
    lastName?: string;
    emails: string[];
    phoneNumbers: string[];
    thirdpartyInfo: {
        thirdpartyId: string;
        thirdpartyUserId: string;
    }[];
    linkedRecipes: {
        recipeId: string;
        recipeUserId: string;
    }[];
};
export declare type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: User[];
};
export default function usersGet(_: APIInterface, options: APIOptions): Promise<Response>;
export {};
