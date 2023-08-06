"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockUpdateUser = exports.mockRevokeAllCodes = exports.mockRevokeCode = exports.mockListCodesByPreAuthSessionId = exports.mockListCodesByPhoneNumber = exports.mockListCodesByEmail = exports.mockListCodesByDeviceId = exports.mockCreateNewCodeForDevice = exports.mockCreateCode = exports.mockConsumeCode = void 0;
const mockCore_1 = require("../accountlinking/mockCore");
const recipe_1 = __importDefault(require("../accountlinking/recipe"));
const mockConsumeCode = async function (input) {
    var _a;
    let resp;
    try {
        resp = await fetch(
            `http://localhost:8080/${
                (_a = input.tenantId) !== null && _a !== void 0 ? _a : "public"
            }/recipe/signinup/code/consume`,
            {
                method: "POST",
                headers: {
                    rid: "passwordless",
                    "content-type": "application/json",
                },
                body: JSON.stringify(copyAndRemoveUserContext(input)),
            }
        );
    } catch (err) {
        if (err.response !== undefined && err.response.status !== undefined && err.response.data !== undefined) {
            throw new Error(
                "SuperTokens core threw an error, " +
                    "status code: " +
                    err.response.status +
                    " and message: " +
                    err.response.data
            );
        } else {
            throw err;
        }
    }
    if (resp.status !== 200) {
        throw new Error(await resp.text());
    }
    const respBody = await resp.json();
    if (respBody.status !== "OK") {
        return respBody;
    }
    const user = respBody.user;
    if (respBody.createdNewUser) {
        respBody.user = mockCore_1.createUserObject({
            tenantIds: user.tenantIds,
            id: user.id,
            timeJoined: user.timeJoined,
            isPrimaryUser: false,
            emails: user.email ? [user.email] : [],
            phoneNumbers: user.phoneNumber ? [user.phoneNumber] : [],
            thirdParty: [],
            loginMethods: [
                {
                    recipeId: "passwordless",
                    recipeUserId: user.id,
                    timeJoined: user.timeJoined,
                    verified: true,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    tenantIds: user.tenantIds,
                },
            ],
        });
    } else {
        respBody.user = await mockCore_1.mockGetUser({
            userId: respBody.user.id,
        });
    }
    return respBody;
};
exports.mockConsumeCode = mockConsumeCode;
const mockCreateCode = async function (input) {
    var _a;
    const resp = await fetch(
        `http://localhost:8080/${(_a = input.tenantId) !== null && _a !== void 0 ? _a : "public"}/recipe/signinup/code`,
        {
            method: "POST",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            body: JSON.stringify(copyAndRemoveUserContext(input)),
        }
    );
    const respBody = await resp.json();
    return respBody;
};
exports.mockCreateCode = mockCreateCode;
const mockCreateNewCodeForDevice = async function (input) {
    var _a;
    const resp = await fetch(
        `http://localhost:8080/${(_a = input.tenantId) !== null && _a !== void 0 ? _a : "public"}/recipe/signinup/code`,
        {
            method: "POST",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            body: JSON.stringify(copyAndRemoveUserContext(input)),
        }
    );
    const respBody = await resp.json();
    return respBody;
};
exports.mockCreateNewCodeForDevice = mockCreateNewCodeForDevice;
const mockListCodesByDeviceId = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};
exports.mockListCodesByDeviceId = mockListCodesByDeviceId;
const mockListCodesByEmail = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};
exports.mockListCodesByEmail = mockListCodesByEmail;
const mockListCodesByPhoneNumber = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};
exports.mockListCodesByPhoneNumber = mockListCodesByPhoneNumber;
const mockListCodesByPreAuthSessionId = async function (input) {
    const resp = await fetch(
        "http://localhost:8080/recipe/signinup/codes?" +
            new URLSearchParams(copyAndRemoveUserContext(input)).toString(),
        {
            method: "GET",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
        }
    );
    const respBody = await resp.json();
    return respBody;
};
exports.mockListCodesByPreAuthSessionId = mockListCodesByPreAuthSessionId;
const mockRevokeCode = async function (input) {
    const resp = await fetch("http://localhost:8080/recipe/signinup/code/remove", {
        method: "POST",
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        body: JSON.stringify(copyAndRemoveUserContext(input)),
    });
    const respBody = await resp.json();
    return respBody;
};
exports.mockRevokeCode = mockRevokeCode;
const mockRevokeAllCodes = async function (input) {
    const resp = await fetch("http://localhost:8080/recipe/signinup/codes/remove", {
        method: "POST",
        headers: {
            rid: "passwordless",
            "content-type": "application/json",
        },
        body: JSON.stringify(copyAndRemoveUserContext(input)),
    });
    const respBody = await resp.json();
    return respBody;
};
exports.mockRevokeAllCodes = mockRevokeAllCodes;
const mockUpdateUser = async function (input) {
    if (input.email !== null) {
        let user = await recipe_1.default.getInstance().recipeInterfaceImpl.getUser({
            userId: input.recipeUserId.getAsString(),
            userContext: {},
        });
        if (user !== undefined && user.isPrimaryUser) {
            let existingUsersWithNewEmail = await recipe_1.default
                .getInstance()
                .recipeInterfaceImpl.listUsersByAccountInfo({
                    accountInfo: {
                        email: input.email,
                    },
                    doUnionOfAccountInfo: false,
                    userContext: {},
                });
            let primaryUserForNewEmail = existingUsersWithNewEmail.filter((u) => u.isPrimaryUser);
            if (primaryUserForNewEmail.length !== 0) {
                if (primaryUserForNewEmail[0].id !== user.id) {
                    return {
                        status: "EMAIL_CHANGE_NOT_ALLOWED_ERROR",
                        reason: "New email is associated with another primary user ID",
                    };
                }
            }
        }
    }
    try {
        const resp = await fetch("http://localhost:8080/recipe/user", {
            method: "PUT",
            headers: {
                rid: "passwordless",
                "content-type": "application/json",
            },
            body: JSON.stringify(
                copyAndRemoveUserContext(
                    Object.assign(Object.assign({}, input), { userId: input.recipeUserId.getAsString() })
                )
            ),
        });
        const respBody = await resp.json();
        return respBody;
    } catch (err) {
        if (err.response !== undefined && err.response.status !== undefined && err.response.data !== undefined) {
            throw new Error(
                "SuperTokens core threw an error, " +
                    "status code: " +
                    err.response.status +
                    " and message: " +
                    err.response.data
            );
        } else {
            throw err;
        }
    }
};
exports.mockUpdateUser = mockUpdateUser;
function copyAndRemoveUserContext(input) {
    let result = Object.assign({}, input);
    delete result.userContext;
    return result;
}
