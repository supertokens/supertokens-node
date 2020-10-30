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
 * TODO: check if disableDefaultImplementation is true, the default signin API does not work - you get a 404
 * TODO: test signInAPI for:
 *        - it works when the input is fine (sign up, and then sign in and check you get the user's info)
 *        - throws an error if the email does not match
 *        - throws an error if the password is incorrect
 * TODO: pass a bad input to the /signin API and test that it throws a 400 error.
 *        - Not a JSON
 *        - No POST body
 *        - Input is JSON, but wrong structure.
 * TODO: Make sure that a successful sign in yields a session
 * TODO: formField validation testing:
 *        - Provide custom email validators to sign up and make sure they are applied to sign in
 *        - Provide custom password validators to sign up and make sure they are applied to sign in
 *        - Test password field validation error
 *        - Test email field validation error
 *        - Input formFields has no email field
 *        - Input formFields has no password field
 * TODO: Test getUserByEmail
 *        - User does not exist
 *        - User exists
 * TODO: Test getUserById
 *        - User does not exist
 *        - User exists
 */
