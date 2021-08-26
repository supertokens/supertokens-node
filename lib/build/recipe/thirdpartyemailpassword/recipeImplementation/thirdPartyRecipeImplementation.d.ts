import { RecipeInterface, User } from "../../thirdparty/types";
import { RecipeInterface as ThirdPartyEmailPasswordRecipeInterface } from "../types";
export default class RecipeImplementation implements RecipeInterface {
    recipeImplementation: ThirdPartyEmailPasswordRecipeInterface;
    constructor(recipeImplementation: ThirdPartyEmailPasswordRecipeInterface);
    getUserByThirdPartyInfo: (input: { thirdPartyId: string; thirdPartyUserId: string }) => Promise<User | undefined>;
    signInUp: (input: {
        thirdPartyId: string;
        thirdPartyUserId: string;
        email: {
            id: string;
            isVerified: boolean;
        };
    }) => Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
          }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
    getUserById: (input: { userId: string }) => Promise<User | undefined>;
    getUsersByEmail: ({ email }: { email: string }) => Promise<User[]>;
    /**
     * @deprecated
     *   */
    getUsersOldestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    /**
     * @deprecated
     *   */
    getUsersNewestFirst: (_: {
        limit?: number | undefined;
        nextPaginationToken?: string | undefined;
    }) => Promise<never>;
    /**
     * @deprecated
     *   */
    getUserCount: () => Promise<never>;
}
