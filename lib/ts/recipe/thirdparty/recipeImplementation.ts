import { RecipeInterface, User } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";

export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier) {
        this.querier = querier;
    }

    getUsers = async (
        timeJoinedOrder: "ASC" | "DESC",
        limit?: number,
        paginationToken?: string
    ): Promise<{
        users: User[];
        nextPaginationToken?: string;
    }> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/users"), {
            timeJoinedOrder,
            limit,
            paginationToken,
        });
        return {
            users: response.users,
            nextPaginationToken: response.nextPaginationToken,
        };
    };

    /**
     * @deprecated Please do not override this function
     *   */
    getUsersOldestFirst = async ({ limit, nextPaginationToken }: { limit?: number; nextPaginationToken?: string }) => {
        return this.getUsers("ASC", limit, nextPaginationToken);
    };

    /**
     * @deprecated Please do not override this function
     *   */
    getUsersNewestFirst = async ({ limit, nextPaginationToken }: { limit?: number; nextPaginationToken?: string }) => {
        return this.getUsers("DESC", limit, nextPaginationToken);
    };

    /**
     * @deprecated Please do not override this function
     *   */
    getUserCount = async () => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/users/count"), {});
        return Number(response.count);
    };

    signInUp = async ({
        thirdPartyId,
        thirdPartyUserId,
        email,
    }: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }): Promise<
        | { status: "OK"; createdNewUser: boolean; user: User }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    > => {
        let response = await this.querier.sendPostRequest(new NormalisedURLPath("/recipe/signinup"), {
            thirdPartyId,
            thirdPartyUserId,
            email,
        });
        return {
            status: "OK",
            createdNewUser: response.createdNewUser,
            user: response.user,
        };
    };

    getUserById = async ({ userId }: { userId: string }): Promise<User | undefined> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
            userId,
        });
        if (response.status === "OK") {
            return {
                ...response.user,
            };
        } else {
            return undefined;
        }
    };

    getUserByThirdPartyInfo = async ({
        thirdPartyId,
        thirdPartyUserId,
    }: {
        thirdPartyId: string;
        thirdPartyUserId: string;
    }): Promise<User | undefined> => {
        let response = await this.querier.sendGetRequest(new NormalisedURLPath("/recipe/user"), {
            thirdPartyId,
            thirdPartyUserId,
        });
        if (response.status === "OK") {
            return {
                ...response.user,
            };
        } else {
            return undefined;
        }
    };
}
