import { isObject } from "@vue/shared"
import { mutableHandlers } from "./baseHandlers"

/**
 * 响应性 Map 缓存对象
 * key: target
 * value: proxy
 * 注意：为了获取指定对象的指定属性对应的执行函数 fn，我们可以借助 WeakMap 实现
 * WeakMap：
 * key: 响应性对象 target
 * value: Map 对象
 *      key：响应性对象的指定属性
 *      value：指定对象指定属性的执行函数 fn
 */
export const reactiveMap = new WeakMap<object, any>()

export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive'
}
/**
 * 为复杂对象 创建响应性对象
 * @param target 被代理对象
 * @returns 代理对象
 */
export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}

/**
 * 创建响应性对象
 * @param target 被代理对象
 * @param baseHandlers handler
 * @param proxyMap 
 */
function createReactiveObject(
    target: object,
    baseHandlers: ProxyHandler<any>,
    proxyMap: WeakMap<object,any>
) {
    // 如果该实例已经被代理，直接读取
    const existingProxy = proxyMap.get(target)
    if(existingProxy) {
        return existingProxy
    }

    // 未代理则生成 proxy 实例
    const proxy = new Proxy(target, baseHandlers)
    // 为 Reactive 增加标记
    proxy[ReactiveFlags.IS_REACTIVE] = true
    // 缓存代理对象
    proxyMap.set(target, proxy)
    return proxy
}

// 对复杂对象进行响应性处理
export const toReactive = <T extends unknown>(value: T): T => isObject(value) ? reactive(value as object) : value

export function isReactive(value: any): boolean {
    return !!(value && value[ReactiveFlags.IS_REACTIVE])
}