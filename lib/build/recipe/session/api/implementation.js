"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const sessionRequestFunctions_1 = require("../sessionRequestFunctions");
const logger_1 = require("../../../logger");
const cookieAndHeaders_1 = require("../cookieAndHeaders");
function getAPIInterface() {
    return {
        refreshPOST: async function ({ options, userContext }) {
            let didClearCookies = clearSessionCookiesFromOlderCookieDomain({
                req: options.req,
                res: options.res,
                config: options.config,
                userContext,
            });
            // Return early if we cleared cookies from older cookie domain
            // to avoid setting multiple cookies with the same name
            if (didClearCookies) {
                return undefined;
            }
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
    };
}
exports.default = getAPIInterface;
/**
 *  This function addresses an edge case where changing the cookieDomain config on the server can
 *  lead to session integrity issues. For instance, if the API server URL is 'api.example.com'
 *  with a cookie domain of '.example.com', and the server updates the cookie domain to 'api.example.com',
 *  the client may retain cookies with both '.example.com' and 'api.example.com' domains.
 *
 *  Consequently, if the server chooses the older cookie, session invalidation occurs, potentially
 *  resulting in an infinite refresh loop. To fix this, users are asked to specify "olderCookieDomain" in
 *  the config.
 *
 * This function checks for multiple cookies with the same name and clears the cookies for the older domain
 */
function clearSessionCookiesFromOlderCookieDomain({ req, res, config, userContext }) {
    let didClearCookies = false;
    const cookieString = req.getHeaderValue("cookie");
    if (cookieString === undefined || config.olderCookieDomain === undefined) {
        return didClearCookies;
    }
    const cookies = parseCookieStringFromRequestHeader(cookieString);
    const tokenTypes = ["access", "refresh"];
    for (const token of tokenTypes) {
        const cookieName = cookieAndHeaders_1.getCookieNameFromTokenType(token);
        if (cookies[cookieName] && cookies[cookieName].length > 1) {
            logger_1.logDebugMessage(
                `clearDuplicateSessionCookies: Clearing duplicate ${cookieName} cookie with domain ${config.olderCookieDomain}`
            );
            cookieAndHeaders_1.setToken(
                Object.assign(Object.assign({}, config), { cookieDomain: config.olderCookieDomain }),
                res,
                token,
                "",
                0,
                "cookie",
                req,
                userContext
            );
            didClearCookies = true;
        }
    }
    return didClearCookies;
}
// This function is required because cookies library (and most of the popular libraries in npm)
// does not support parsing multiple cookies with the same name.
function parseCookieStringFromRequestHeader(cookieString) {
    const cookies = {};
    const cookiePairs = cookieString.split(";");
    for (const cookiePair of cookiePairs) {
        const [name, value] = cookiePair
            .trim()
            .split("=")
            .map((part) => decodeURIComponent(part));
        if (cookies.hasOwnProperty(name)) {
            cookies[name].push(value);
        } else {
            cookies[name] = [value];
        }
    }
    return cookies;
}
