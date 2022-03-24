"use strict";
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
