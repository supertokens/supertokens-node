import { APIFunction, APIInterface, APIOptions } from "../../types";
import STError from "../../../../error";
import Session from "../../../session";

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

export const userSessionsGet: APIFunction = async (_: APIInterface, options: APIOptions): Promise<Response> => {
    const userId = options.req.getKeyValueFromQuery("userId");

    if (userId === undefined) {
        throw new STError({
            message: "Missing required parameter 'userId'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    const response = await Session.getAllSessionHandlesForUser(userId);

    let sessions: SessionType[] = [];
    let sessionInfoPromises: Promise<void>[] = [];

    for (let i = 0; i < response.length; i++) {
        sessionInfoPromises.push(
            new Promise(async (res, rej) => {
                try {
                    const sessionResponse = await Session.getSessionInformation(response[i]);

                    if (sessionResponse !== undefined) {
                        sessions[i] = sessionResponse;
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
