"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getAPIInterface;
const utils_1 = require("../../../utils");
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const sessionRequestFunctions_1 = require("../sessionRequestFunctions");
function getAPIInterface() {
    return {
        refreshPOST: async function ({ options, userContext }) {
            return (0, sessionRequestFunctions_1.refreshSessionInRequest)({
                req: options.req,
                res: options.res,
                userContext,
                config: options.config,
                recipeInterfaceImpl: options.recipeImplementation,
            });
        },
        verifySession: async function ({ verifySessionOptions, options, userContext }) {
            let method = (0, utils_1.normaliseHttpMethod)(options.req.getMethod());
            if (method === "options" || method === "trace") {
                return undefined;
            }
            let incomingPath = new normalisedURLPath_1.default(options.req.getOriginalURL());
            let refreshTokenPath = options.config.refreshTokenPath;
            if (incomingPath.equals(refreshTokenPath) && method === "post") {
                return (0, sessionRequestFunctions_1.refreshSessionInRequest)({
                    req: options.req,
                    res: options.res,
                    userContext,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                });
            } else {
                return (0, sessionRequestFunctions_1.getSessionFromRequest)({
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
    };
}
