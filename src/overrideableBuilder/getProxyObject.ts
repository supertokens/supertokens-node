import { ProxiedImplementation } from './types'

export function getProxyObject<T extends Record<string, undefined | ((...args: any[]) => any)>>(orig: T): T {
  const ret: ProxiedImplementation<T> = {
    ...orig,
    _call: (_, __) => {
      throw new Error('This function should only be called through the recipe object')
    },
  }
  const keys = Object.keys(ret) as (keyof typeof ret)[]
  for (const k of keys) {
    if (k !== '_call') {
      ret[k] = function (this: ProxiedImplementation<T>, ...args: any[]) {
        return this._call(k, args)
      } as ProxiedImplementation<T>[keyof T]
    }
  }
  return ret
}
