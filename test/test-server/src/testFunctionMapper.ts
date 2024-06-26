let userIdInCallback;
let recipeUserIdInCallback;

export function getSessionVars() {
    return {
        userIdInCallback,
        recipeUserIdInCallback,
    };
}

export function resetSessionVars() {
    userIdInCallback = undefined;
    recipeUserIdInCallback = undefined;
}

export function getFunc(evalStr: string): (...args: any[]) => any {
    if (evalStr.startsWith("session.fetchAndSetClaim")) {
        return async (a, c) => {
            (userIdInCallback = a), (recipeUserIdInCallback = c);
        };
    }

    throw new Error("Unknown eval string");
}
