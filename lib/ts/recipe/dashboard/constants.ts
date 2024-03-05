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

export const DASHBOARD_API = "/dashboard";
export const SIGN_IN_API = "/api/signin";
export const SIGN_OUT_API = "/api/signout";
export const VALIDATE_KEY_API = "/api/key/validate";
export const USERS_LIST_GET_API = "/api/users";
export const USERS_COUNT_API = "/api/users/count";
export const USER_API = "/api/user";
export const USER_EMAIL_VERIFY_API = "/api/user/email/verify";
export const USER_METADATA_API = "/api/user/metadata";
export const USER_SESSIONS_API = "/api/user/sessions";
export const USER_PASSWORD_API = "/api/user/password";
export const USER_EMAIL_VERIFY_TOKEN_API = "/api/user/email/verify/token";
export const SEARCH_TAGS_API = "/api/search/tags";
export const DASHBOARD_ANALYTICS_API = "/api/analytics";
export const TENANTS_LIST_API = "/api/tenants/list";

export const USERROLES_LIST_API = "/api/userroles/roles";
export const USERROLES_ROLE_API = "/api/userroles/role";
export const USERROLES_PERMISSIONS_API = "/api/userroles/role/permissions";
export const USERROLES_REMOVE_PERMISSIONS_API = "/api/userroles/role/permissions/remove";

export const CREATE_EMAIL_PASSWORD_USER = "/api/user/emailpassword";
export const CREATE_PASSWORDLESS_USER = "/api/user/passwordless";

export const LIST_TENANT_LOGIN_METHODS = "/api/tenants/login-methods";
export const USERROLES_USER_API = "/api/userroles/user/roles";

export const TENANT_API = "/api/tenant";
export const ASSOCIATE_USER_TO_TENANT = "/api/tenants/user/associate";
export const DISASSOCIATE_USER_FROM_TENANT = "/api/tenants/user/disassociate";
export const TENANT_THIRD_PARTY = "/api/tenants/third-party";
export const LIST_ALL_THIRD_PARTY_PROVIDERS = "/api/tenants/third-party/providers";

export const UNLINK_USER = "/api/user/unlink";

export const LIST_ALL_CORE_CONFIG_PROPERTIES = "/api/multitenancy/core-config/list";
