// @ts-nocheck
import type { User } from "../../types";
import { Querier } from "../../querier";
export declare function mockCreateNewOrUpdateEmailOfRecipeUser(
    thirdPartyId: string,
    thirdPartyUserId: string,
    email: string,
    tenantId: string,
    querier: Querier
): Promise<
    | {
          status: "OK";
          createdNewUser: boolean;
          user: User;
      }
    | {
          status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR";
          reason: string;
      }
>;
