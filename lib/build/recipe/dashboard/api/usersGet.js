"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = usersGet;
exports.getSearchParamsFromURL = getSearchParamsFromURL;
const error_1 = __importDefault(require("../../../error"));
const __1 = require("../../..");
const recipe_1 = __importDefault(require("../../usermetadata/recipe"));
const usermetadata_1 = __importDefault(require("../../usermetadata"));
async function usersGet(_, tenantId, options) {
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
    let usersResponse =
        timeJoinedOrder === "DESC"
            ? await (0, __1.getUsersNewestFirst)({
                  tenantId,
                  query,
                  limit: parseInt(limit),
                  paginationToken,
              })
            : await (0, __1.getUsersOldestFirst)({
                  tenantId,
                  query,
                  limit: parseInt(limit),
                  paginationToken,
              });
    // If the UserMetaData recipe has been initialised, fetch first and last name
    try {
        recipe_1.default.getInstanceOrThrowError();
    } catch (e) {
        // Recipe has not been initialised, return without first name and last name
        return {
            status: "OK",
            users: usersResponse.users.map((u) => u.toJson()),
            nextPaginationToken: usersResponse.nextPaginationToken,
        };
    }
    let updatedUsersArray = [];
    let metaDataFetchPromises = [];
    for (let i = 0; i < usersResponse.users.length; i++) {
        const userObj = usersResponse.users[i].toJson();
        metaDataFetchPromises.push(
            () =>
                new Promise(async (resolve, reject) => {
                    try {
                        const userMetaDataResponse = await usermetadata_1.default.getUserMetadata(userObj.id);
                        const { first_name, last_name } = userMetaDataResponse.metadata;
                        updatedUsersArray[i] = Object.assign(Object.assign({}, userObj), {
                            firstName: first_name,
                            lastName: last_name,
                        });
                        resolve(true);
                    } catch (e) {
                        // Something went wrong when fetching user meta data
                        reject(e);
                    }
                })
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
        await Promise.all(promisesToCall.map((p) => p()));
        promiseArrayStartPosition += batchSize;
    }
    usersResponse = Object.assign(Object.assign({}, usersResponse), { users: updatedUsersArray });
    return {
        status: "OK",
        users: usersResponse.users,
        nextPaginationToken: usersResponse.nextPaginationToken,
    };
}
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
