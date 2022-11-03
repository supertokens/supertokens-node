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
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("../../../../error");
const session_1 = require("../../../session");
exports.userSessionsGet = (_, options) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const userId = options.req.getKeyValueFromQuery("userId");
        if (userId === undefined) {
            throw new error_1.default({
                message: "Missing required parameter 'userId'",
                type: error_1.default.BAD_INPUT_ERROR,
            });
        }
        const response = yield session_1.default.getAllSessionHandlesForUser(userId);
        let sessions = [];
        let sessionInfoPromises = [];
        for (let i = 0; i < response.length; i++) {
            sessionInfoPromises.push(
                new Promise((res, rej) =>
                    __awaiter(void 0, void 0, void 0, function* () {
                        try {
                            const sessionResponse = yield session_1.default.getSessionInformation(response[i]);
                            if (sessionResponse !== undefined) {
                                sessions[i] = sessionResponse;
                            }
                            res();
                        } catch (e) {
                            rej(e);
                        }
                    })
                )
            );
        }
        yield Promise.all(sessionInfoPromises);
        return {
            status: "OK",
            sessions,
        };
    });
