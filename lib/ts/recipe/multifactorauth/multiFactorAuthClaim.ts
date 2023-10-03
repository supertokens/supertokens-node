import RecipeUserId from "../../recipeUserId";
import { SessionClaim } from "../session/claims";
import { JSONObject } from "../usermetadata";
import Recipe from "./recipe";
import { MFAClaimValue } from "./types";

/**
 * We include "Class" in the class name, because it makes it easier to import the right thing (the instance) instead of this.
 * */
export class MultiFactorAuthClaimClass extends SessionClaim<MFAClaimValue> {
    public key = "st-mfa";

    public fetchValue = (userId: string, recipeUserId: RecipeUserId, tenantId: string | undefined, userContext: any) => {
        
        return {
            c: {},
            n: [],
        }
    }

    public addToPayload_internal = (payload: JSONObject, value: MFAClaimValue) => {
        const prevValue = payload[this.key] as MFAClaimValue | undefined;
        return {
            ...payload,
            [this.key]: {
                c: {
                    ...prevValue?.c,
                    ...value.c,
                },
                n: value.n,
            }
        }
    }

    public removeFromPayload = (payload: JSONObject) => {
        const retVal = {
            ...payload,
        }
        delete retVal[this.key];

        return retVal;
    }

    public removeFromPayloadByMerge_internal = () => {
        return {
            [this.key] : null,
        }
    }

    public getValueFromPayload = (payload: JSONObject) => {
        return payload[this.key] as MFAClaimValue;
    }
}
