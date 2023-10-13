// @ts-nocheck
import RecipeUserId from "../../recipeUserId";
import { SessionClaimValidator } from "../session";
import { SessionClaim } from "../session/claims";
import { JSONObject } from "../usermetadata";
import { MFAClaimValue, MFARequirementList } from "./types";
/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export declare class MultiFactorAuthClaimClass extends SessionClaim<MFAClaimValue> {
    validators: {
        passesMFARequirements: (requirements?: MFARequirementList) => SessionClaimValidator;
    };
    constructor(key?: string);
    buildNextArray(_completedClaims: MFAClaimValue["c"], _requirements: MFARequirementList): never[];
    fetchValue: (
        _userId: string,
        _recipeUserId: RecipeUserId,
        _tenantId: string | undefined,
        _userContext: any
    ) => {
        c: {};
        n: never[];
    };
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
