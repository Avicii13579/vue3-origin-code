import { track, trigger } from "./effect"

const get = createGetter()
const set = createSetter()
/**
 * 响应性的 handler 监听 setter getter
 */
export const mutableHandlers: ProxyHandler<object> = {
    get,
    set
}

/**
 * getter 回调方法 
 * 注意：Reflect 具备同步修改 Proxy 的能力，并且 Reflect.set 方法不会触发 Proxy.set 函数，造成递归
 * @returns 
 */
function createGetter() {
    return function get(target:object, key:string | symbol, receiver:object) {
        // 利用 reflect 得到返回值
        const res = Reflect.get(target,key,receiver)
        // 收集依赖
        track(target,key)
        return res
    }
}

/**
 * setter 回调
 * 注意 使用 unknown 和 any 的区别，可以确保我们在对 value 进行操作之前进行类型检查
 * @returns 
 */
function createSetter() {
    return function set(target:object, key:string | symbol, value:unknown, receiver: object) {
            // 利用 Reflect.set 设置新值
            const result = Reflect.set(target, key, value,receiver)
            // 触发依赖
            trigger(target,key,value)
            return result
    }
}