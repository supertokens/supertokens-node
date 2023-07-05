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
exports.getSearchParamsFromURL = void 0;
const error_1 = __importDefault(require("../../../error"));
const supertokens_1 = __importDefault(require("../../../supertokens"));
const recipe_1 = __importDefault(require("../../usermetadata/recipe"));
const usermetadata_1 = __importDefault(require("../../usermetadata"));
function usersGet(_, tenantId, options, userContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const req = options.req;
        const limit = options.req.getKeyValueFromQuery("limit");
        if (limit === undefined) {
            throw new error_1.default({
                message: "Missing required parameter 'limit'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        let timeJoinedOrder = req.getKeyValueFromQuery("timeJoinedOrder");
        if (timeJoinedOrder === undefined) {
            timeJoinedOrder = "DESC";
        }
        if (timeJoinedOrder !== "ASC" && timeJoinedOrder !== "DESC") {
            throw new error_1.default({
                message: "Invalid value recieved for 'timeJoinedOrder'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        let paginationToken = options.req.getKeyValueFromQuery("paginationToken");
        const query = getSearchParamsFromURL(options.req.getOriginalURL());
        let usersResponse = yield supertokens_1.default.getInstanceOrThrowError().getUsers({
            query,
            timeJoinedOrder: timeJoinedOrder,
            limit: parseInt(limit),
            paginationToken,
            tenantId,
        });
        // If the UserMetaData recipe has been initialised, fetch first and last name
        try {
            recipe_1.default.getInstanceOrThrowError();
        } catch (e) {
            // Recipe has not been initialised, return without first name and last name
            return {
                status: "OK",
                users: usersResponse.users,
                nextPaginationToken: usersResponse.nextPaginationToken,
            };
        }
        let updatedUsersArray = [];
        let metaDataFetchPromises = [];
        for (let i = 0; i < usersResponse.users.length; i++) {
            const userObj = usersResponse.users[i];
            metaDataFetchPromises.push(
                () =>
                    new Promise((resolve, reject) =>
                        __awaiter(this, void 0, void 0, function* () {
                            try {
                                const userMetaDataResponse = yield usermetadata_1.default.getUserMetadata(
                                    userObj.user.id,
                                    userContext
                                );
                                const { first_name, last_name } = userMetaDataResponse.metadata;
                                updatedUsersArray[i] = {
                                    recipeId: userObj.recipeId,
                                    user: Object.assign(Object.assign({}, userObj.user), {
                                        firstName: first_name,
                                        lastName: last_name,
                                    }),
                                };
                                resolve(true);
                            } catch (e) {
                                // Something went wrong when fetching user meta data
                                reject(e);
                            }
                        })
                    )
            );
        }
        let promiseArrayStartPosition = 0;
        let batchSize = 5;
        while (promiseArrayStartPosition < metaDataFetchPromises.length) {
            /**
             * We want to query only 5 in parallel at a time
             *
             * First we check if the the array has enough elements to iterate
             * promiseArrayStartPosition + 4 (5 elements including current)
             */
            let promiseArrayEndPosition = promiseArrayStartPosition + (batchSize - 1);
            // If the end position is higher than the arrays length, we need to adjust it
            if (promiseArrayEndPosition >= metaDataFetchPromises.length) {
                /**
                 * For example if the array has 7 elements [A, B, C, D, E, F, G], when you run
                 * the second batch [startPosition = 5], this will result in promiseArrayEndPosition
                 * to be equal to 6 [5 + ((7 - 1) - 5)] and will then iterate over indexes [5] and [6]
                 */
                promiseArrayEndPosition =
                    promiseArrayStartPosition + (metaDataFetchPromises.length - 1 - promiseArrayStartPosition);
            }
            let promisesToCall = [];
            for (let j = promiseArrayStartPosition; j <= promiseArrayEndPosition; j++) {
                promisesToCall.push(metaDataFetchPromises[j]);
            }
            yield Promise.all(promisesToCall.map((p) => p()));
            promiseArrayStartPosition += batchSize;
        }
        usersResponse = Object.assign(Object.assign({}, usersResponse), { users: updatedUsersArray });
        return {
            status: "OK",
            users: usersResponse.users,
            nextPaginationToken: usersResponse.nextPaginationToken,
        };
    });
}
exports.default = usersGet;
function getSearchParamsFromURL(path) {
    const URLObject = new URL("https://exmaple.com" + path);
    const params = new URLSearchParams(URLObject.search);
    const searchQuery = {};
    for (const [key, value] of params) {
        if (!["limit", "timeJoinedOrder", "paginationToken"].includes(key)) {
            searchQuery[key] = value;
        }
    }
    return searchQuery;
}
exports.getSearchParamsFromURL = getSearchParamsFromURL;
