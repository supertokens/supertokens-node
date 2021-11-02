type ProxiedImplementation<T> = {
    [P in keyof T]: T[P];
} & {
    _call: <K extends keyof T>(fname: K, args: any[]) => T[K];
};

function getProxyObject<T extends Record<string, undefined | ((...args: any[]) => any)>>(orig: T): T {
    const ret: ProxiedImplementation<T> = {
        ...orig,
        _call: (_, __) => {
            throw new Error("This function should only be called through the recipe object");
        },
    };
    const keys = Object.keys(ret) as (keyof typeof ret)[];
    for (const k of keys) {
        if (k !== "_call") {
            ret[k] = function (this: ProxiedImplementation<T>, ...args: any[]) {
                return this._call(k, args);
            } as ProxiedImplementation<T>[keyof T];
        }
    }
    return ret;
}

export default class OverrideableBuilder<T extends Record<string, undefined | ((...args: any[]) => any)>> {
    private layers: [T, ...Partial<T>[]];
    private proxies: T[];
    result?: T;

    constructor(originalImplementation: T) {
        this.layers = [originalImplementation];
        this.proxies = [];
    }

    override(overrideFunc: (originalImplementation: T, builder?: OverrideableBuilder<T>) => T): OverrideableBuilder<T> {
        const proxy = getProxyObject(this.layers[0]) as T;
        const layer = overrideFunc(proxy, this);
        for (const key of Object.keys(this.layers[0]) as (keyof T)[]) {
            if (layer[key] === proxy[key] || key === "_call") {
                delete layer[key];
            } else if (layer[key] === undefined) {
                layer[key] = null as any;
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

        this.result = {} as T;
        for (const layer of this.layers) {
            for (const key of Object.keys(layer) as (keyof T)[]) {
                const func = layer[key];
                if (func !== undefined) {
                    if (func === null) {
                        this.result[key] = undefined as any;
                    } else {
                        this.result[key] = func.bind(this.result) as T[keyof T];
                    }
                }
            }
        }

        for (let proxyInd = 0; proxyInd < this.proxies.length; ++proxyInd) {
            const proxy = this.proxies[proxyInd];
            (proxy as any)._call = <K extends keyof T>(fname: K, args: any) => {
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
