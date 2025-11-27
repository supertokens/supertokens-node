"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSessionsGet = void 0;
const error_1 = __importDefault(require("../../../../error"));
const constants_1 = require("../../../multitenancy/constants");
const userSessionsGet = async ({ stInstance, options, userContext }) => {
    const userId = options.req.getKeyValueFromQuery("userId");
    if (userId === undefined || userId === "") {
        throw new error_1.default({
            message: "Missing required parameter 'userId'",
            type: error_1.default.BAD_INPUT_ERROR,
        });
    }
    const sessionRecipe = stInstance.getRecipeInstanceOrThrow("session");
    const response = await sessionRecipe.recipeInterfaceImpl.getAllSessionHandlesForUser({
        userId,
        fetchSessionsForAllLinkedAccounts: true,
        tenantId: constants_1.DEFAULT_TENANT_ID,
        fetchAcrossAllTenants: true,
        userContext,
    });
    let sessions = [];
    let sessionInfoPromises = [];
    for (let i = 0; i < response.length; i++) {
        sessionInfoPromises.push(
            new Promise(async (res, rej) => {
                try {
                    const sessionResponse = await sessionRecipe.recipeInterfaceImpl.getSessionInformation({
                        sessionHandle: response[i],
                        userContext,
                    });
                    if (sessionResponse !== undefined) {
                        const accessTokenPayload = sessionResponse.customClaimsInAccessTokenPayload;
                        delete sessionResponse.customClaimsInAccessTokenPayload;
                        sessions[i] = Object.assign(Object.assign({}, sessionResponse), { accessTokenPayload });
                    }
                    res();
                } catch (e) {
                    rej(e);
                }
            })
        );
    }
    await Promise.all(sessionInfoPromises);
    return {
        status: "OK",
        sessions,
    };
};
exports.userSessionsGet = userSessionsGet;
