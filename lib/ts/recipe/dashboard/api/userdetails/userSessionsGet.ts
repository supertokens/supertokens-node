import { APIFunction } from "../../types";
import STError from "../../../../error";
import { DEFAULT_TENANT_ID } from "../../../multitenancy/constants";

type SessionType = {
    sessionDataInDatabase: any;
    accessTokenPayload: any;
    userId: string;
    expiry: number;
    timeCreated: number;
    sessionHandle: string;
};

type Response = {
    status: "OK";
    sessions: SessionType[];
};

export const userSessionsGet: APIFunction = async ({
    stInstance,
    options,
    userContext,
}: Parameters<APIFunction>[0]): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");

    if (userId === undefined || userId === "") {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const sessionRecipe = stInstance.getRecipeInstanceOrThrow("session");
    const response = await sessionRecipe.recipeInterfaceImpl.getAllSessionHandlesForUser({
        userId,
        fetchSessionsForAllLinkedAccounts: true,
        tenantId: DEFAULT_TENANT_ID,
        fetchAcrossAllTenants: true,
        userContext,
    });

    let sessions: SessionType[] = [];
    let sessionInfoPromises: Promise<void>[] = [];

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
                        sessions[i] = { ...sessionResponse, accessTokenPayload };
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
