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
 * TODO: check if disableDefaultImplementation is true, the default signup API does not work - you get a 404
 * TODO: test signUpAPI for:
 *        - it works when the input is fine (sign up, get user id, get email of that user and check the input email is same as the one used for sign up)
 *        - throws an error in case of duplicate email.
 * TODO: pass a bad input to the /signup API and test that it throws a 400 error.
 *        - Not a JSON
 *        - No POST body
 *        - Input is JSON, but wrong structure.
 *        - formFields is not an array
 *        - formFields does not exist
 *        - formField elements have no id or no value field
 * TODO: providing the handleCustomFormFields should work:
 *        - If not provided by the user, it should not result in an error
 *        - If provided by the user, and custom fields are there, only those should be sent
 *        - If provided by the user, and no custom fields are there, then the formFields param must sbe empty
 * TODO: Make sure that a successful sign up yields a session
 * TODO: formField validation testing:
 *        - Provide formFields in config but not in input to signup and see error about it being missing
 *        - Good test case without optional
 *        - Bad test case without optional (something is missing, and it's not optional)
 *        - Good test case with optionals
 *        - Input formFields has no email field (and not in config)
 *        - Input formFields has no password field (and not in config
 *        - Input form field has different number of custom fields than in config form fields)
 *        - Input form field has same number of custom fields as in config form field, but some ids mismatch
 *        - Test custom field validation error (one and two custom fields)
 *        - Test password field validation error
 *        - Test email field validation error
 */
