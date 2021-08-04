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
const utils_1 = require("../../../utils");
const error_1 = require("../error");
exports.getUsersByEmailAPI = (api, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        if (api.usersByEmailGET === undefined) {
            return options.next();
        }
        const email = options.req.query["email"];
        if (email === undefined || typeof email !== "string") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide a single GET param 'email'",
            });
        }
        const response = yield api.usersByEmailGET({ email, options });
        return utils_1.send200Response(options.res, response);
    });
//# sourceMappingURL=getUsersByEmailAPI.js.map
