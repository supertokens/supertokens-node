"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRegenerateSession = exports.mockGetSession = exports.mockCreateNewSession = exports.mockGetRefreshAPIResponse = void 0;
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
function mockGetRefreshAPIResponse(requestBody, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/refresh"),
            requestBody
        );
        if (response.status === "OK") {
            response.session.recipeUserId = response.session.userId;
            return response;
        } else if (response.status === "UNAUTHORISED") {
            return response;
        } else {
            response.session.recipeUserId = response.session.userId;
            return response;
        }
    });
}
exports.mockGetRefreshAPIResponse = mockGetRefreshAPIResponse;
function mockCreateNewSession(requestBody, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session"), requestBody);
        response.session.recipeUserId = response.session.userId;
        return response;
    });
}
exports.mockCreateNewSession = mockCreateNewSession;
function mockGetSession(requestBody, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(
            new normalisedURLPath_1.default("/recipe/session/verify"),
            requestBody
        );
        if (response.status === "OK") {
            response.session.recipeUserId = response.session.userId;
            return response;
        } else {
            return response;
        }
    });
}
exports.mockGetSession = mockGetSession;
function mockRegenerateSession(accessToken, newAccessTokenPayload, querier) {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield querier.sendPostRequest(new normalisedURLPath_1.default("/recipe/session/regenerate"), {
            accessToken: accessToken,
            userDataInJWT: newAccessTokenPayload,
        });
        if (response.status === "UNAUTHORISED") {
            return response;
        }
        response.session.recipeUserId = response.session.userId;
        return response;
    });
}
exports.mockRegenerateSession = mockRegenerateSession;
