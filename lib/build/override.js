"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getProxyObject(orig) {
    const ret = Object.assign(Object.assign({}, orig), {
        _call: (_, __) => {
            throw new Error("This function should only be called through the recipe object");
        },
    });
    const keys = Object.keys(ret);
    for (const k of keys) {
        if (k !== "_call") {
            ret[k] = function (...args) {
                return this._call(k, args);
            };
        }
    }
    return ret;
}
class OverrideableBuilder {
    constructor(originalImplementation) {
        this.layers = [originalImplementation];
        this.proxies = [];
    }
    override(overrideFunc) {
        const proxy = getProxyObject(this.layers[0]);
        const layer = overrideFunc(proxy, this);
        for (const key of Object.keys(this.layers[0])) {
            if (layer[key] === proxy[key] || key === "_call") {
                delete layer[key];
            } else if (layer[key] === undefined) {
                layer[key] = null;
            }
        }
        this.layers.push(layer);
        this.proxies.push(proxy);
        return this;
    }
    build() {
        if (this.result) {
            return this.result;
        }
        this.result = {};
        for (const layer of this.layers) {
            for (const key of Object.keys(layer)) {
                const func = layer[key];
                if (func !== undefined) {
                    if (func === null) {
                        this.result[key] = undefined;
                    } else if (typeof func === "function") {
                        this.result[key] = func.bind(this.result);
                    } else {
                        this.result[key] = func;
                    }
                }
            }
        }
        for (let proxyInd = 0; proxyInd < this.proxies.length; ++proxyInd) {
            const proxy = this.proxies[proxyInd];
            proxy._call = (fname, args) => {
                for (let i = proxyInd; i >= 0; --i) {
                    const func = this.layers[i][fname];
                    if (func !== undefined) {
                        return func.bind(this.result)(...args);
                    }
                }
            };
        }
        return this.result;
    }
}
exports.default = OverrideableBuilder;
