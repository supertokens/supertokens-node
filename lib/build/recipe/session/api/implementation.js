"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("../error");
const utils_1 = require("../../../utils");
const normalisedURLPath_1 = require("../../../normalisedURLPath");
function getAPIInterface() {
    return {
        refreshPOST: function ({ options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                yield options.recipeImplementation.refreshSession({ req: options.req, res: options.res, userContext });
            });
        },
        verifySession: function ({ verifySessionOptions, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let method = utils_1.normaliseHttpMethod(options.req.getMethod());
                if (method === "options" || method === "trace") {
                    return undefined;
                }
                let incomingPath = new normalisedURLPath_1.default(options.req.getOriginalURL());
                let refreshTokenPath = options.config.refreshTokenPath;
                if (incomingPath.equals(refreshTokenPath) && method === "post") {
                    return yield options.recipeImplementation.refreshSession({
                        req: options.req,
                        res: options.res,
                        userContext,
                    });
                } else {
                    return yield options.recipeImplementation.getSession({
                        req: options.req,
                        res: options.res,
                        options: verifySessionOptions,
                        userContext,
                    });
                }
            });
        },
        signOutPOST: function ({ options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let session;
                try {
                    session = yield options.recipeImplementation.getSession({
                        req: options.req,
                        res: options.res,
                        userContext,
                    });
                } catch (err) {
                    if (error_1.default.isErrorFromSuperTokens(err) && err.type === error_1.default.UNAUTHORISED) {
                        // The session is expired / does not exist anyway. So we return OK
                        return {
                            status: "OK",
                        };
                    }
                    throw err;
                }
                if (session === undefined) {
                    throw new Error("Session is undefined. Should not come here.");
                }
                yield session.revokeSession(userContext);
                return {
                    status: "OK",
                };
            });
        },
    };
}
exports.default = getAPIInterface;
