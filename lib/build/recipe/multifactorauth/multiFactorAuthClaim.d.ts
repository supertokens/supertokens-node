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
        hasCompletedMFARequirementsForAuth: (id?: string) => SessionClaimValidator;
        hasCompletedRequirementList(requirementList: MFARequirementList, id?: string): SessionClaimValidator;
    };
    getNextSetOfUnsatisfiedFactors(
        completedFactors: MFAClaimValue["c"],
        requirementList: MFARequirementList
    ): {
        factorIds: string[];
        type: "string" | "oneOf" | "allOfInAnyOrder";
    };
    fetchValue: (
        _userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ) => Promise<{
        c: Record<string, number | undefined>;
        v: boolean;
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
                      [x: string]: number | undefined;
                  };
                  v: boolean;
              }
            | null
            | undefined;
    };
    removeFromPayload: (payload: JSONObject) => {
        [ind: string]: import("../../types").JSONValue;
    };
    removeFromPayloadByMerge_internal: (payload: JSONObject) => {
        [x: string]: import("../../types").JSONValue;
    };
    getValueFromPayload: (payload: JSONObject) => MFAClaimValue;
}
export declare const MultiFactorAuthClaim: MultiFactorAuthClaimClass;
