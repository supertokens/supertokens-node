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
import { send200Response } from "../../../utils";
import UserMetaDataRecipe from "../../usermetadata/recipe";
import UserMetaData from "../../usermetadata";

export default async function usersGet(_: APIInterface, options: APIOptions): Promise<boolean> {
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
        send200Response(options.res, {
            status: "OK",
            ...usersResponse,
        });
        return true;
    }

    let updatedUsersArray: {
        recipeId: string;
        user: any;
    }[] = [];
    let metaDataFetchPromises: Promise<any>[] = [];

    usersResponse.users.forEach((userObj) => {
        metaDataFetchPromises.push(
            new Promise(async (resolve, reject) => {
                try {
                    const userMetaDataResponse = await UserMetaData.getUserMetadata(userObj.user.id);
                    const { first_name, last_name } = userMetaDataResponse.metadata;

                    updatedUsersArray.push({
                        ...userObj,
                        user: {
                            ...userObj.user,
                            firstName: first_name,
                            lastName: last_name,
                        },
                    });
                    resolve(true);
                } catch (e) {
                    // Something went wrong when fetching user meta data
                    reject(e);
                }
            })
        );
    });

    await Promise.all(metaDataFetchPromises);

    usersResponse = {
        ...usersResponse,
        users: updatedUsersArray,
    };

    send200Response(options.res, {
        status: "OK",
        ...usersResponse,
    });

    return true;
}
