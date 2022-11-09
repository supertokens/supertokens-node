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
            let parsedData = JSON.parse(data);
            if (typeof parsedData !== "object") {
                throw new Error();
            }
            if (Array.isArray(parsedData)) {
                throw new Error();
            }
            if (parsedData === null) {
                throw new Error();
            }
        } catch (e) {
            throw new error_1.default({
                message: "'data' must be a valid JSON body",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        /**
         * This API is meant to set the user metadata of a user. We delete the existing data
         * before updating it because we want to make sure that shallow merging does not result
         * in the data being incorrect
         *
         * For example if the old data is {test: "test", test2: "test2"} and the user wants to delete
         * test2 from the data simply calling updateUserMetadata with {test: "test"} would not remove
         * test2 because of shallow merging.
         *
         * Removing first ensures that the final data is exactly what the user wanted it to be
         */
        yield usermetadata_1.default.clearUserMetadata(userId);
        yield usermetadata_1.default.updateUserMetadata(userId, JSON.parse(data));
        return {
            status: "OK",
        };
    });
