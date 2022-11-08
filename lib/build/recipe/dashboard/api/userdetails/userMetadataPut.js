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
const recipe_1 = require("../../../usermetadata/recipe");
const usermetadata_1 = require("../../../usermetadata");
const error_1 = require("../../../../error");
exports.userMetadataPut = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const requestBody = yield options.req.getJSONBody();
        const userId = requestBody.userId;
        const data = requestBody.data;
        // This is to throw an error early in case the recipe has not been initialised
        recipe_1.default.getInstanceOrThrowError();
        if (userId === undefined || typeof userId !== "string") {
            throw new error_1.default({
                message: "Required parameter 'userId' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        if (data === undefined || typeof data !== "string") {
            throw new error_1.default({
                message: "Required parameter 'data' is missing or has an invalid type",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        // Make sure that data is a valid JSON, this will throw
        try {
            JSON.parse(data);
        } catch (e) {
            throw new error_1.default({
                message: "'data' must be a valid JSON body",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        yield usermetadata_1.default.clearUserMetadata(userId);
        yield usermetadata_1.default.updateUserMetadata(userId, JSON.parse(data));
        return {
            status: "OK",
        };
    });
