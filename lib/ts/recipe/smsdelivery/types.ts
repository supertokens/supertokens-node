/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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

export interface SmsService<TypeInput> {
    sendSms: (input: TypeInput, userContext: any) => Promise<void>;
}

export type RecipeInterface<TypeInput> = {
    sendSms: (input: TypeInput, userContext: any) => Promise<void>;
};

/**
 * input given by the user if SmsDelivery config is passed in parent Recipe
 */
export interface TypeConfigInput<TypeInput> {
    service: SmsService<TypeInput>;
    override?: (originalImplementation: RecipeInterface<TypeInput>) => RecipeInterface<TypeInput>;
}

/**
 * config class parameter when parent Recipe create a new SmsDeliveryRecipe object via constructor
 */
export interface ConfigInput<TypeInput> {
    service: SmsService<TypeInput>;
    recipeImpl: RecipeInterface<TypeInput>;
}
