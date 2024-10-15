"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = __importDefault(require("../"));
const utils_1 = require("../../../utils");
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const sessionRequestFunctions_1 = require("../sessionRequestFunctions");
const error_1 = __importDefault(require("../error"));
const __2 = require("../../..");
function getAPIInterface() {
    return {
        refreshPOST: async function ({ options, userContext }) {
            return sessionRequestFunctions_1.refreshSessionInRequest({
                req: options.req,
                res: options.res,
                userContext,
                config: options.config,
                recipeInterfaceImpl: options.recipeImplementation,
            });
        },
        verifySession: async function ({ verifySessionOptions, options, userContext }) {
            let method = utils_1.normaliseHttpMethod(options.req.getMethod());
            if (method === "options" || method === "trace") {
                return undefined;
            }
            let incomingPath = new normalisedURLPath_1.default(options.req.getOriginalURL());
            let refreshTokenPath = options.config.refreshTokenPath;
            if (incomingPath.equals(refreshTokenPath) && method === "post") {
                return sessionRequestFunctions_1.refreshSessionInRequest({
                    req: options.req,
                    res: options.res,
                    userContext,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                });
            } else {
                return sessionRequestFunctions_1.getSessionFromRequest({
                    req: options.req,
                    res: options.res,
                    options: verifySessionOptions,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                    userContext,
                });
            }
        },
        signOutPOST: async function ({ session, userContext }) {
            await session.revokeSession(userContext);
            return {
                status: "OK",
            };
        },
        allSessionsGET: async function ({ session, options, tenantId, userContext }) {
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
            const existingUser = await __2.getUser(userId, userContext);
            if (existingUser === undefined) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
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
            const userSessions = [];
            const sessionGetPromises = [];
            allSessionHandles.forEach((sessionHandle) => {
                sessionGetPromises.push(
                    new Promise(async (resolve, reject) => {
                        try {
                            const sessionInformation = await __1.default.getSessionInformation(
                                sessionHandle,
                                userContext
                            );
                            if (sessionInformation !== undefined) {
                                userSessions.push(sessionInformation);
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
        revokeSessionPOST: undefined,
    };
}
exports.default = getAPIInterface;
