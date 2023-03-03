// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
import { RecipeLevelUser } from "../../accountlinking/types";
declare type User = {
    id: string;
    timeJoined: number;
    isPrimaryUser: boolean;
    emails: string[];
    phoneNumbers: string[];
    thirdParty: {
        id: string;
        userId: string;
    }[];
    firstName?: string;
    lastName?: string;
    loginMethods: (RecipeLevelUser & {
        verified: boolean;
    })[];
};
export declare type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: User[];
};
export default function usersGet(_: APIInterface, options: APIOptions): Promise<Response>;
export {};
