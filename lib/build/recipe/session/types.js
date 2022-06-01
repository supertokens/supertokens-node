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
class SessionClaimBuilder {
    constructor(key) {
        this.key = key;
    }
    applyToPayload(userId, payload, userContext) {
        return __awaiter(this, void 0, void 0, function* () {
            const value = yield this.fetch(userId, userContext);
            if (value === undefined) {
                return this.removeFromPayload(payload, userContext);
            }
            return this.addToPayload_internal(payload, value, userContext);
        });
    }
}
exports.SessionClaimBuilder = SessionClaimBuilder;
