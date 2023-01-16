// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
declare type User = {
    id: string;
    timeJoined: number;
    isPrimaryUser: boolean;
    emails: string[];
    phoneNumbers: string[];
    firstName?: string;
    lastName?: string;
    loginMethods: {
        recipeId: string;
        recipeUserId: string;
        timeJoined: number;
        verified: boolean;
        email?: string;
        phoneNumber?: string;
        thirdParty?: {
            id: string;
            userId: string;
        };
    }[];
};
export declare type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: User[];
};
export default function usersGet(_: APIInterface, options: APIOptions): Promise<Response>;
export {};
