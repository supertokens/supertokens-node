// @ts-nocheck
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import { SessionContainerInterface } from "../session/types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static MultiFactorAuthClaim: import("./multiFactorAuthClaim").MultiFactorAuthClaimClass;
    static enableFactorForUser(
        tenantId: string,
        userId: string,
        factorId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        newEnabledFactors: string[];
    }>;
    static enableFactorForTenant(
        tenantId: string,
        factorId: string,
        userContext?: any
    ): Promise<{
        status: "OK";
        newEnabledFactors: string[];
    }>;
    static completeFactorInSession(
        session: SessionContainerInterface,
        factor: string,
        userContext?: any
    ): Promise<void>;
}
export declare let init: typeof Recipe.init;
export declare let enableFactorForTenant: typeof Wrapper.enableFactorForTenant;
export declare let enableFactorForUser: typeof Wrapper.enableFactorForUser;
export declare let completeFactorInSession: typeof Wrapper.completeFactorInSession;
export { MultiFactorAuthClaim };
export type { RecipeInterface, APIOptions, APIInterface };
