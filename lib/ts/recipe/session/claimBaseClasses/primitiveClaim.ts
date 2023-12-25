import RecipeUserId from "../../../recipeUserId";
import { JSONObject, JSONPrimitive, UserContext } from "../../../types";
import { SessionClaim, SessionClaimValidator } from "../types";

export class PrimitiveClaim<T extends JSONPrimitive> extends SessionClaim<T> {
    public readonly fetchValue: (
        userId: string,
        recipeUserId: RecipeUserId,
        tenantId: string,
        currentPayload: JSONObject | undefined,
        userContext: UserContext
    ) => Promise<T | undefined> | T | undefined;
    public readonly defaultMaxAgeInSeconds: number | undefined;

    constructor(config: { key: string; fetchValue: SessionClaim<T>["fetchValue"]; defaultMaxAgeInSeconds?: number }) {
        super(config.key);
        this.fetchValue = config.fetchValue;
        this.defaultMaxAgeInSeconds = config.defaultMaxAgeInSeconds;
    }

    addToPayload_internal(payload: any, value: T, _userContext: UserContext): any {
        return {
            ...payload,
            [this.key]: {
                v: value,
                t: Date.now(),
            },
        };
    }
    removeFromPayloadByMerge_internal(payload: any, _userContext: UserContext): any {
        const res = {
            ...payload,
            [this.key]: null,
        };

        return res;
    }

    removeFromPayload(payload: any, _userContext: UserContext): any {
        const res = {
            ...payload,
        };
        delete res[this.key];

        return res;
    }

    getValueFromPayload(payload: any, _userContext: UserContext): T | undefined {
        return payload[this.key]?.v;
    }

    getLastRefetchTime(payload: any, _userContext: UserContext): number | undefined {
        return payload[this.key]?.t;
    }

    validators = {
        hasValue: (
            val: T,
            maxAgeInSeconds: number | undefined = this.defaultMaxAgeInSeconds,
            id?: string
        ): SessionClaimValidator => {
            return {
                claim: this,
                id: id ?? this.key,
                shouldRefetch: (payload, ctx) =>
                    this.getValueFromPayload(payload, ctx) === undefined ||
                    (maxAgeInSeconds !== undefined && // We know payload[this.id] is defined since the value is not undefined in this branch
                        payload[this.key].t < Date.now() - maxAgeInSeconds * 1000),
                validate: async (payload, ctx) => {
                    const claimVal = this.getValueFromPayload(payload, ctx);
                    if (claimVal === undefined) {
                        return {
                            isValid: false,
                            reason: { message: "value does not exist", expectedValue: val, actualValue: claimVal },
                        };
                    }
                    const ageInSeconds = (Date.now() - this.getLastRefetchTime(payload, ctx)!) / 1000;
                    if (maxAgeInSeconds !== undefined && ageInSeconds > maxAgeInSeconds) {
                        return {
                            isValid: false,
                            reason: {
                                message: "expired",
                                ageInSeconds,
                                maxAgeInSeconds,
                            },
                        };
                    }

                    if (claimVal !== val) {
                        return {
                            isValid: false,
                            reason: { message: "wrong value", expectedValue: val, actualValue: claimVal },
                        };
                    }
                    return { isValid: true };
                },
            };
        },
    };
}
