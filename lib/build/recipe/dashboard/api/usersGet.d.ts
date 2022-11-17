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
export default function usersGet(_: APIInterface, options: APIOptions): Promise<Response>;
