import Session from "../../../recipe/session";
import * as supertokens from "../../../lib/build";
import { parseJWTWithoutSignatureVerification } from "../../../lib/build/recipe/session/jwt";
import SessionClass from "../../../lib/build/recipe/session/sessionClass";
import SessionRecipe from "../../../lib/build/recipe/session/recipe";
import { SessionClaimValidator, TokenInfo } from "../../../lib/build/recipe/session/types";
import { BooleanClaim, PrimitiveArrayClaim, PrimitiveClaim } from "../../../lib/build/recipe/session/claims";
import { EmailVerificationClaim } from "../../../recipe/emailverification";
import { MultiFactorAuthClaim } from "../../../recipe/multifactorauth";
import { PermissionClaim, UserRoleClaim } from "../../../recipe/userroles";
import { logOverrideEvent } from "./overrideLogging";

const testClaimSetups = {
    "st-true": () =>
        new BooleanClaim({
            key: "st-true",
            fetchValue: () => true,
        }),
    "st-undef": () =>
        new BooleanClaim({
            key: "st-undef",
            fetchValue: () => undefined,
        }),
};

// Add all built-in claims
for (const c of [EmailVerificationClaim, MultiFactorAuthClaim, UserRoleClaim, PermissionClaim]) {
    testClaimSetups[c.key] = () => c;
}

const mockClaimBuilder = ({ key, values }) => {
    const claim = new PrimitiveClaim({
        key: key ?? "st-stub-primitive",
        fetchValue: (userId, recipeUserId, tenantId, currentPayload, userContext) => {
            logOverrideEvent(`claim-${key}.fetchValue`, "CALL", {
                userId,
                recipeUserId,
                tenantId,
                currentPayload,
                userContext,
            });

            // Here we can't reuse popOrUseVal because the values are arrays themselves
            const retVal =
                userContext["st-stub-arr-value"] ??
                (values instanceof Array && values[0] instanceof Array ? values.pop() : values);
            logOverrideEvent(`claim-${key}.fetchValue`, "RES", retVal);

            return retVal;
        },
    });

    return claim;
};

export function deserializeClaim(serializedClaim: { key: string; values: any }) {
    if (serializedClaim.key.startsWith("st-stub-")) {
        return mockClaimBuilder({ ...serializedClaim, key: serializedClaim.key.replace(/^st-stub-/, "") });
    }
    return testClaimSetups[serializedClaim.key](serializedClaim);
}

export function deserializeValidator(
    serializedValidator: { key: string } & (
        | { validatorName: string; args: any[] }
        | { id?: string; shouldRefetchRes: boolean | boolean[]; validateRes: any | any[] }
    )
): SessionClaimValidator {
    const claim = testClaimSetups[serializedValidator.key](serializedValidator);
    if ("validatorName" in serializedValidator) {
        return claim.validators[serializedValidator.validatorName](...serializedValidator.args);
    }
    return {
        id: serializedValidator.id ?? serializedValidator.key,
        claim,
        shouldRefetch: (payload, ctx) => {
            logOverrideEvent(`${serializedValidator.key}-shouldRefetch`, "CALL", { payload, ctx });
            const retVal =
                ctx[`${serializedValidator.key}-shouldRefetch-res`] ??
                popOrUseVal(serializedValidator.shouldRefetchRes);
            logOverrideEvent(`${serializedValidator.key}-shouldRefetch`, "RES", { retVal });

            return retVal;
        },
        validate: (payload, ctx) => {
            logOverrideEvent(`${serializedValidator.key}-validate`, "CALL", { payload, ctx });
            const retVal =
                ctx[`${serializedValidator.key}-validate-res`] ?? popOrUseVal(serializedValidator.validateRes);
            logOverrideEvent(`${serializedValidator.key}-validate`, "RES", { retVal });
            return retVal;
        },
    };
}

export async function convertRequestSessionToSessionObject(
    tokens:
        | {
              accessToken: string;
              frontToken: string;
              refreshToken: TokenInfo | undefined;
              antiCsrfToken: string | undefined;
          }
        | undefined
): Promise<Session.SessionContainer | undefined> {
    if (tokens !== undefined) {
        const helpers = {
            config: SessionRecipe.getInstanceOrThrowError().config,
            getRecipeImpl: () => SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl,
        };

        const jwtInfo = parseJWTWithoutSignatureVerification(tokens.accessToken);
        const jwtPayload = jwtInfo.payload;

        let userId = jwtInfo.version === 2 ? jwtPayload.userId! : jwtPayload.sub!;
        let sessionHandle = jwtPayload.sessionHandle!;

        let recipeUserId = new supertokens.RecipeUserId(jwtPayload.rsub ?? userId);
        let antiCsrfToken = jwtPayload.antiCsrfToken;
        let tenantId = jwtInfo.version >= 4 ? jwtPayload.tId! : "public";

        const session = new SessionClass(
            helpers as any,
            tokens.accessToken,
            tokens.frontToken,
            tokens.refreshToken,
            antiCsrfToken,
            sessionHandle,
            userId,
            recipeUserId,
            jwtPayload,
            undefined,
            false,
            tenantId
        );
        return session;
    }
    return tokens;
}

export function serializeUser(response) {
    return {
        ...("user" in response && response.user instanceof supertokens.User
            ? {
                  user: response.user.toJson(),
              }
            : {}),
    };
}

export function serializeRecipeUserId(response) {
    return {
        ...("recipeUserId" in response && response.recipeUserId instanceof supertokens.RecipeUserId
            ? {
                  recipeUserId: response.recipeUserId.getAsString(),
              }
            : {}),
    };
}

function popOrUseVal<T>(arrOrValue: T | T[]): T {
    if (arrOrValue instanceof Array) {
        if (arrOrValue.length === 0) {
            throw new Error("Ran out of values");
        }
        return arrOrValue.pop()!;
    }
    return arrOrValue;
}
