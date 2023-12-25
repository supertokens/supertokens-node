// @ts-nocheck
import RecipeUserId from "../../recipeUserId";
import { SessionClaimValidator } from "../session";
import { SessionClaim } from "../session/claims";
import { JSONObject } from "../usermetadata";
import { MFAClaimValue, MFARequirementList } from "./types";
import { UserContext } from "../../types";
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class MultiFactorAuthClaimClass extends SessionClaim<MFAClaimValue> {
    constructor(key?: string);
    validators: {
        hasCompletedMFARequirementForAuth: (id?: string) => SessionClaimValidator;
        hasCompletedFactors(requirements: MFARequirementList, id?: string): SessionClaimValidator;
    };
    buildNextArray(completedClaims: MFAClaimValue["c"], requirements: MFARequirementList): string[];
    fetchValue: (
        userId: string,
        _recipeUserId: RecipeUserId,
        tenantId: string | undefined,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ) => Promise<{
        c: Record<string, number>;
        n: string[];
    }>;
    addToPayload_internal: (
        payload: JSONObject,
        value: MFAClaimValue
    ) => {
        [x: string]:
            | string
            | number
            | boolean
            | JSONObject
            | import("../../types").JSONArray
            | {
                  c: {
                      [x: string]: number;
                  };
                  n: string[];
              }
            | null
            | undefined;
    };
    removeFromPayload: (
        payload: JSONObject
    ) => {
        [x: string]: import("../../types").JSONValue;
    };
    removeFromPayloadByMerge_internal: () => {
        [x: string]: null;
    };
    getValueFromPayload: (payload: JSONObject) => MFAClaimValue;
}
export declare const MultiFactorAuthClaim: MultiFactorAuthClaimClass;
