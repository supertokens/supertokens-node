/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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

import type { NormalisedAppinfo, User } from "../../types";
import { SessionContainer } from "../session";
import type {
    TypeInput,
    RecipeLevelUser,
    RecipeInterface,
    TypeNormalisedInput,
    AccountInfoAndEmailWithRecipeId,
} from "./types";
import EmailPasswordRecipe from "../emailpassword/recipe";
import ThirdPartyRecipe from "../thirdparty/recipe";
import PasswordlessRecipe from "../passwordless/recipe";
import EmailPassword from "../emailpassword";
import ThirdParty from "../thirdparty";
import Passwordless from "../passwordless";
import ThirdPartyEmailPassword from "../thirdpartyemailpassword";
import ThirdPartyPasswordless from "../thirdpartypasswordless";

async function defaultOnAccountLinked(_user: User, _newAccountInfo: RecipeLevelUser, _userContext: any) {}

async function defaultShouldDoAutomaticAccountLinking(
    _newAccountInfo: AccountInfoAndEmailWithRecipeId,
    _user: User | undefined,
    _session: SessionContainer | undefined,
    _userContext: any
): Promise<{
    shouldAutomaticallyLink: false;
}> {
    return {
        shouldAutomaticallyLink: false,
    };
}

export function validateAndNormaliseUserInput(_: NormalisedAppinfo, config: TypeInput): TypeNormalisedInput {
    let onAccountLinked = config.onAccountLinked || defaultOnAccountLinked;
    let shouldDoAutomaticAccountLinking =
        config.shouldDoAutomaticAccountLinking || defaultShouldDoAutomaticAccountLinking;

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        ...config.override,
    };

    return {
        override,
        onAccountLinked,
        shouldDoAutomaticAccountLinking,
    };
}

export async function getUserForRecipeId(
    userId: string,
    recipeId: string
): Promise<{
    user: RecipeLevelUser | undefined;
    recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;
}> {
    let user: RecipeLevelUser | undefined;
    let recipe:
        | "emailpassword"
        | "thirdparty"
        | "passwordless"
        | "thirdpartyemailpassword"
        | "thirdpartypasswordless"
        | undefined;

    if (recipeId === EmailPasswordRecipe.RECIPE_ID) {
        try {
            const userResponse = await EmailPassword.getUserById(userId);

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    recipeId: "emailpassword",
                };
                recipe = "emailpassword";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyEmailPassword.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        recipeId: "emailpassword",
                    };
                    recipe = "thirdpartyemailpassword";
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === ThirdPartyRecipe.RECIPE_ID) {
        try {
            const userResponse = await ThirdParty.getUserById(userId);

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    recipeId: "thirdparty",
                };
                recipe = "thirdparty";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyEmailPassword.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        recipeId: "thirdparty",
                    };
                    recipe = "thirdpartyemailpassword";
                }
            } catch (e) {
                // No - op
            }
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyPasswordless.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        recipeId: "thirdparty",
                    };
                    recipe = "thirdpartypasswordless";
                }
            } catch (e) {
                // No - op
            }
        }
    } else if (recipeId === PasswordlessRecipe.RECIPE_ID) {
        try {
            const userResponse = await Passwordless.getUserById({
                userId,
            });

            if (userResponse !== undefined) {
                user = {
                    ...userResponse,
                    recipeId: "passwordless",
                };
                recipe = "passwordless";
            }
        } catch (e) {
            // No - op
        }

        if (user === undefined) {
            try {
                const userResponse = await ThirdPartyPasswordless.getUserById(userId);

                if (userResponse !== undefined) {
                    user = {
                        ...userResponse,
                        recipeId: "passwordless",
                    };
                    recipe = "thirdpartypasswordless";
                }
            } catch (e) {
                // No - op
            }
        }
    }

    return {
        user,
        recipe,
    };
}
