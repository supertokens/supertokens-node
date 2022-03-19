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
class PrimitiveGrant {
    constructor(id) {
        this.id = id;
    }
    addToGrantPayload(grantPayload, value, _userContext) {
        return Object.assign(Object.assign({}, grantPayload), {
            [this.id]: {
                v: value,
                t: new Date().getTime(),
            },
        });
    }
    removeFromGrantPayload(grantPayload, _userContext) {
        const res = Object.assign({}, grantPayload);
        delete res[this.id];
        return res;
    }
}
exports.PrimitiveGrant = PrimitiveGrant;
class BooleanGrant extends PrimitiveGrant {
    constructor(conf) {
        super(conf.id);
        this.fetchGrant = conf.fetchGrant;
        this.shouldRefetchGrant = conf.shouldRefetchGrant;
    }
    isGrantValid(grantPayload, _userContext) {
        return grantPayload[this.id] !== undefined && grantPayload[this.id].v;
    }
}
exports.BooleanGrant = BooleanGrant;
class ManualBooleanGrant extends BooleanGrant {
    constructor(conf) {
        super({
            id: conf.id,
            fetchGrant(_userId, _userContext) {
                return __awaiter(this, void 0, void 0, function* () {
                    return undefined;
                });
            },
            shouldRefetchGrant(_grantPayload, _userContext) {
                return false;
            },
        });
        this.conf = conf;
    }
    isGrantValid(grantPayload, userContext) {
        return (
            super.isGrantValid(grantPayload, userContext) &&
            this.conf.expirationTimeInSeconds !== undefined &&
            grantPayload[this.id].t < new Date().getTime() - this.conf.expirationTimeInSeconds * 1000
        );
    }
}
exports.ManualBooleanGrant = ManualBooleanGrant;
