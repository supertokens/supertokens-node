import { getProxyObject } from './getProxyObject'
import { NullablePartial } from './types'

export class OverrideableBuilder<T extends Record<string, any>> {
  private layers: [T, ...NullablePartial<T>[]]
  private proxies: T[]
  result?: T

  constructor(originalImplementation: T) {
    this.layers = [originalImplementation]
    this.proxies = []
  }

  override(overrideFunc: (originalImplementation: T, builder: OverrideableBuilder<T>) => T): OverrideableBuilder<T> {
    const proxy = getProxyObject(this.layers[0]) as T
    const layer = overrideFunc(proxy, this) as NullablePartial<T>
    for (const key of Object.keys(this.layers[0]) as (keyof T)[]) {
      if (layer[key] === proxy[key] || key === '_call')
        delete layer[key]

      else if (layer[key] === undefined)
        layer[key] = null
    }

    this.layers.push(layer)
    this.proxies.push(proxy)

    return this
  }

  build() {
    if (this.result)
      return this.result

    this.result = {} as T
    for (const layer of this.layers) {
      for (const key of Object.keys(layer) as (keyof T)[]) {
        const override = layer[key]
        if (override !== undefined) {
          if (override === null)
            this.result[key] = undefined as T[keyof T]

          else if (typeof override === 'function')
            this.result[key] = override.bind(this.result) as T[keyof T]

          else
            this.result[key] = override as T[keyof T]
        }
      }
    }

    for (let proxyInd = 0; proxyInd < this.proxies.length; ++proxyInd) {
      const proxy = this.proxies[proxyInd];
      (proxy as any)._call = <K extends keyof T>(fname: K, args: any) => {
        for (let i = proxyInd; i >= 0; --i) {
          const func = this.layers[i][fname]
          if (func !== undefined && func !== null)
            return func.bind(this.result)(...args)
        }
      }
    }
    return this.result
  }
}

export default OverrideableBuilder
