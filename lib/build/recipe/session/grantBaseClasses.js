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
class PrimitiveClaim {
    constructor(id) {
        this.id = id;
    }
    addToPayload(payload, value, _userContext) {
        return Object.assign(Object.assign({}, payload), {
            [this.id]: {
                v: value,
                t: new Date().getTime(),
            },
        });
    }
    removeFromPayload(payload, _userContext) {
        const res = Object.assign({}, payload);
        delete res[this.id];
        return res;
    }
}
exports.PrimitiveClaim = PrimitiveClaim;
class BooleanClaim extends PrimitiveClaim {
    constructor(conf) {
        super(conf.id);
        this.fetch = conf.fetch;
        this.shouldRefetch = conf.shouldRefetch;
    }
    isValid(payload, _userContext) {
        return payload[this.id] !== undefined && payload[this.id].v === true;
    }
}
exports.BooleanClaim = BooleanClaim;
class ManualBooleanClaim extends BooleanClaim {
    constructor(conf) {
        super({
            id: conf.id,
            fetch(_userId, _userContext) {
                return __awaiter(this, void 0, void 0, function* () {
                    return undefined;
                });
            },
            shouldRefetch(_payload, _userContext) {
                return false;
            },
        });
        this.conf = conf;
    }
    isValid(payload, userContext) {
        return (
            super.isValid(payload, userContext) &&
            this.conf.expirationTimeInSeconds !== undefined &&
            payload[this.id] !== null &&
            payload[this.id] !== undefined &&
            payload[this.id].t < new Date().getTime() - this.conf.expirationTimeInSeconds * 1000
        );
    }
}
exports.ManualBooleanClaim = ManualBooleanClaim;
