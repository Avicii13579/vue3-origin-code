import { isArray } from "@vue/shared";
import { createDep, Dep } from "./dep";

// 实二级 Map 里一个 Key 对应多个 value （场景：一个 html 里的 effect 函数多次调用）
type KeyToDepMap = Map<any,Dep>
/**
 * WeakMap 的 key 类型为 any，value 的类型为 KeyToDepMap
 */
const targetMap = new WeakMap<any,KeyToDepMap>()
/**
 * 收集依赖的方法
 * @param target WeakMap 的 key
 * @param key 代理对象的 key，当依赖被触发时，需要根据 key 判断依赖是否存在
 */
export function track(target:object,key:unknown) {
    console.log(' track：收集依赖');
    // 如果当前执行函数不存在，则直接 return
    if(!activeEffect)  return
    // 尝试从 targetMap 中获取 target 对应的 value：Map
    let depsMap = targetMap.get(target)
    if(!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    // 如果 key 对应的值 Set 不存在，则生成新的 Set 对象，并将该对象复制给 Value
    if(!dep) {
        depsMap.set(key, (dep = createDep()))
    }
    trackEffects(dep)
}
/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 * @param dep 
 */
export  function trackEffects(dep: Dep) {
    // 此处断言 activeEffect 不为 null 或 undefined
    // activeEffect 如何被多次传入? 注意：每一次调用 effect 都会用 new ReactiveEffect 去创建实例，而 activeEffect 会通过 实例.run函数 指向这个 effect 实例
    dep.add(activeEffect!)
}

/**
 * 触发依赖的方法
 * @param target WeakMap 的 key
 * @param key 代理对象的 key，当依赖被触发时，需要根据 key 获取
 * @param newValue key 对应的新值
 */
export function trigger(target:object, key?:unknown,newValue?:unknown) {
    console.log('trigger: 触发依赖');
    // 根据 target 获取存储的 Map 实例
    const depsMap = targetMap.get(target)
    if (!depsMap) return 
    // 依据指定的 Key 获取 dep 实例
    let dep:Dep | undefined = depsMap.get(key)
    if(!dep) return
    // 执行 effect 中的 fn 函数（执行了和属性有依赖的副作用函数） fn 就是暴露出的 effect 函数里传递的匿名回调函数
    // effect.fn()
    triggerEffects(dep)
}

/**
 * 依次触发 dep 中保存的依赖
 * @param dep 
 */
export function triggerEffects(dep: Dep) {
    // 把 dep 构建成一个数组
    const effects = isArray(dep) ? dep : [...dep]
    // 依次触发
    for(const effect of effects) {
        triggerEffect(effect)
    }
}

export function triggerEffect(effect: ReactiveEffect) {
    effect.run()
}

/**
 * effect 函数
 * @param fn 
 * @returns 以 ReactiveEffect 实例为 this 的执行函数
 */
export function effect<T =any>(fn:() => T) {
    // 实现 ReactiveEffect 实例
    const _effect = new ReactiveEffect(fn)
    // 执行 run 函数（默认 effect 调用里的 fn 会执行一次）
    _effect.run()
}

/**
 * 单例的 当前的 effect 拥有 run 函数能执行 fn 的 ReactiveEffect 的实例
 */
export let activeEffect: ReactiveEffect | undefined

/**
 * 响应性触发依赖时的执行类
 */
export  class ReactiveEffect<T = any> {
    // 接收传入的回调函数 fn
    constructor(public fn:() => T) {}

    run() {
        // 为 activeEffect 复制
        activeEffect = this
        // 执行 fn 函数
        return this.fn()
    }
}