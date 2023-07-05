// @ts-nocheck
import { APIInterface, APIOptions } from "../types";
export declare type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: {
        recipeId: string;
        user: {
            id: string;
            timeJoined: number;
            firstName?: string;
            lastName?: string;
            tenantIds: string[];
        } & (
            | {
                  email: string;
              }
            | {
                  email: string;
                  thirdParty: {
                      id: string;
                      userId: string;
                  };
              }
            | {
                  email?: string;
                  phoneNumber?: string;
              }
        );
    }[];
};
export default function usersGet(
    _: APIInterface,
    tenantId: string,
    options: APIOptions,
    userContext: any
): Promise<Response>;
export declare function getSearchParamsFromURL(
    path: string
): {
    [key: string]: string;
};
