/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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

/**
 * TODO: in passwordResetFunctions.ts:
 *        - check that getResetPasswordURL works fine
 *        - check that createAndSendCustomEmail works fine
 * TODO: generate token API:
 *        - Call the createResetPasswordToken function with valid input
 *        - Call the createResetPasswordToken with unknown userId and test error thrown
 *        - password validation checks
 *        - non existent email should return "OK" with a pause > 300MS
 *        - check that the generated password reset link is correct
 *        - check if that if the getResetPasswordURL function is given by the user, that is called
 *        - check that the password link has a token and a rid
 * TODO: password reset API:
 *        - Call the resetPasswordUsingToken function with valid input
 *        - Call the resetPasswordUsingToken with an invalid token and see the error
 *        - token is missing from input
 *        - token is not of type string from input
 *        - invalid token in input
 *        - password is invalid in input
 *        - password is missing in input
 *        - input is valid, check that password has changed (call sign in)
 */
