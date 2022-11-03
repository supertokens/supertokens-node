/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import { APIInterface, APIOptions } from "../types";
import STError from "../../../error";
import SuperTokens from "../../../supertokens";
import UserMetaDataRecipe from "../../usermetadata/recipe";
import UserMetaData from "../../usermetadata";

export type Response = {
    status: "OK";
    nextPaginationToken?: string;
    users: {
        recipeId: string;
        user: {
            id: string;
            timeJoined: number;
            firstName?: string;
            lastName?: string;
        } & (
            | {
                  email: string;
              }
            | {
                  email: string;
                  thirdParty: {
                      id: string;
                      userId: string;
                  };
              }
            | {
                  email?: string;
                  phoneNumber?: string;
              }
        );
    }[];
};

export default async function usersGet(_: APIInterface, options: APIOptions): Promise<Response> {
    const req = options.req;
    const limit = options.req.getKeyValueFromQuery("limit");

    if (limit === undefined) {
        throw new STError({
            message: "Missing required parameter 'limit'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let timeJoinedOrder = req.getKeyValueFromQuery("timeJoinedOrder");

    if (timeJoinedOrder === undefined) {
        timeJoinedOrder = "DESC";
    }

    if (timeJoinedOrder !== "ASC" && timeJoinedOrder !== "DESC") {
        throw new STError({
            message: "Invalid value recieved for 'timeJoinedOrder'",
            type: STError.BAD_INPUT_ERROR,
        });
    }

    let paginationToken = options.req.getKeyValueFromQuery("paginationToken");

    let usersResponse = await SuperTokens.getInstanceOrThrowError().getUsers({
        timeJoinedOrder: timeJoinedOrder,
        limit: parseInt(limit),
        paginationToken,
    });

    // If the UserMetaData recipe has been initialised, fetch first and last name
    try {
        UserMetaDataRecipe.getInstanceOrThrowError();
    } catch (e) {
        // Recipe has not been initialised, return without first name and last name
        return {
            status: "OK",
            users: usersResponse.users,
            nextPaginationToken: usersResponse.nextPaginationToken,
        };
    }

    let updatedUsersArray: {
        recipeId: string;
        user: any;
    }[] = [];
    let metaDataFetchPromises: (() => Promise<any>)[] = [];

    for (let i = 0; i < usersResponse.users.length; i++) {
        const userObj = usersResponse.users[i];
        metaDataFetchPromises.push(
            (): Promise<any> =>
                new Promise(async (resolve, reject) => {
                    try {
                        const userMetaDataResponse = await UserMetaData.getUserMetadata(userObj.user.id);
                        const { first_name, last_name } = userMetaDataResponse.metadata;

                        updatedUsersArray[i] = {
                            recipeId: userObj.recipeId,
                            user: {
                                ...userObj.user,
                                firstName: first_name,
                                lastName: last_name,
                            },
                        };
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

        let promisesToCall: (() => Promise<any>)[] = [];

        for (let j = promiseArrayStartPosition; j <= promiseArrayEndPosition; j++) {
            promisesToCall.push(metaDataFetchPromises[j]);
        }

        await Promise.all(promisesToCall.map((p) => p()));
        promiseArrayStartPosition += batchSize;
    }

    usersResponse = {
        ...usersResponse,
        users: updatedUsersArray,
    };

    return {
        status: "OK",
        users: usersResponse.users,
        nextPaginationToken: usersResponse.nextPaginationToken,
    };
}
