import SessionWrapper, { APIInterface, APIOptions, VerifySessionOptions } from "../";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";
import { SessionContainerInterface, SessionInformationWithExtractedInformation } from "../types";
import { GeneralErrorResponse, UserContext } from "../../../types";
import { getSessionFromRequest, refreshSessionInRequest } from "../sessionRequestFunctions";
import SessionError from "../error";
import { getUser } from "../../..";
import { USER_AGENT_KEY_FOR_SESSION_DATA } from "../constants";

export default function getAPIInterface(): APIInterface {
    return {
        refreshPOST: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: UserContext;
        }): Promise<SessionContainerInterface> {
            return refreshSessionInRequest({
                req: options.req,
                res: options.res,
                userContext,
                config: options.config,
                recipeInterfaceImpl: options.recipeImplementation,
            });
        },

        verifySession: async function ({
            verifySessionOptions,
            options,
            userContext,
        }: {
            verifySessionOptions: VerifySessionOptions | undefined;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<SessionContainerInterface | undefined> {
            let method = normaliseHttpMethod(options.req.getMethod());
            if (method === "options" || method === "trace") {
                return undefined;
            }

            let incomingPath = new NormalisedURLPath(options.req.getOriginalURL());

            let refreshTokenPath = options.config.refreshTokenPath;

            if (incomingPath.equals(refreshTokenPath) && method === "post") {
                return refreshSessionInRequest({
                    req: options.req,
                    res: options.res,
                    userContext,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                });
            } else {
                return getSessionFromRequest({
                    req: options.req,
                    res: options.res,
                    options: verifySessionOptions,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                    userContext,
                });
            }
        },

        signOutPOST: async function ({
            session,
            userContext,
        }: {
            options: APIOptions;
            session: SessionContainerInterface;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
              }
            | GeneralErrorResponse
        > {
            await session.revokeSession(userContext);

            return {
                status: "OK",
            };
        },

        allSessionsGET: async function ({
            session,
            options,
            tenantId,
            userContext,
        }): Promise<
            | {
                  status: "OK";
                  sessions: SessionInformationWithExtractedInformation[];
              }
            | SessionError
            | GeneralErrorResponse
        > {
            /**
             * Get all the active sessions for the logged in user.
             *
             * This function will fetched all sessions for the user and
             * return them in descending order based on the time the session
             * was created at.
             */
            // Get the logged in user's userId
            const userId = session.getUserId(userContext);

            // We need to verify that the user is authenticated because
            // the getAllSessionHandlesForUser function doesn't check
            // whether the user is logged in or not
            const existingUser = await getUser(userId, userContext);
            if (existingUser === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }

            // We will first fetch the list of sessionHandles for the user
            // and then fetch the information for each of them.
            const allSessionHandles = await options.recipeImplementation.getAllSessionHandlesForUser({
                userId,
                fetchSessionsForAllLinkedAccounts: true,
                tenantId,
                fetchAcrossAllTenants: false,
                userContext,
            });

            // Since we need to fetch multiple sessions information,
            // we are creating multiple promises for fetching the details
            // and using a Promise.all() to resolve them together.
            const userSessions: SessionInformationWithExtractedInformation[] = [];
            const sessionGetPromises: Promise<void>[] = [];

            allSessionHandles.forEach((sessionHandle) => {
                sessionGetPromises.push(
                    new Promise(async (resolve, reject) => {
                        try {
                            const sessionInformation = await SessionWrapper.getSessionInformation(
                                sessionHandle,
                                userContext
                            );
                            if (sessionInformation !== undefined) {
                                userSessions.push({
                                    ...sessionInformation,
                                    userAgent:
                                        sessionInformation.sessionDataInDatabase[USER_AGENT_KEY_FOR_SESSION_DATA],
                                });
                            }

                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    })
                );
            });

            // Wait for the sessions to be fetched.
            await Promise.all(sessionGetPromises);

            // Sort the fetched session based on their timeCreated values
            // to ensure that the newer sessions show up at the top.
            const sessionsSortedByCreatedTime = userSessions.sort(
                (sessionA, sessionB) => sessionB.timeCreated - sessionA.timeCreated
            );

            return {
                status: "OK",
                sessions: sessionsSortedByCreatedTime,
            };
        },

        revokeSessionPOST: async function ({
            sessionHandle,
            session,
            options,
            userContext,
        }): Promise<
            | {
                  status: "OK";
              }
            | GeneralErrorResponse
        > {
            /**
             * Revoke the session passed using the sessionHandle.
             */
            // Get the logged in user's userId
            const userId = session.getUserId(userContext);

            // We need to verify that the user is authenticated because
            // the revokeSession function doesn't check
            // whether the user is logged in or not
            const existingUser = await getUser(userId, userContext);
            if (existingUser === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }

            const wasRevoked = await options.recipeImplementation.revokeSession({
                sessionHandle,
                userContext,
            });

            if (!wasRevoked) {
                // This is a very unlikely case but we should still consider
                // it since the upper level function returns this.
                //
                // We will just throw an error so that the API consumer
                // can understand that session was not removed.
                throw new Error("Failed to revoke session");
            }

            return {
                status: "OK",
            };
        },
    };
}
