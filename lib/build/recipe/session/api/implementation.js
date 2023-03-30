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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const sessionRequestFunctions_1 = require("../sessionRequestFunctions");
function getAPIInterface() {
    return {
        refreshPOST: function ({ options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                return sessionRequestFunctions_1.refreshSessionInRequest({
                    req: options.req,
                    res: options.res,
                    userContext,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                });
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
            });
        },
        signOutPOST: function ({ session, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                if (session !== undefined) {
                    yield session.revokeSession(userContext);
                }
                return {
                    status: "OK",
                };
            });
        },
    };
}
exports.default = getAPIInterface;
