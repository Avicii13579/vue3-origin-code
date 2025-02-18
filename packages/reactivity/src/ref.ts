import { createDep, Dep } from "./dep"
import { activeEffect, trackEffects } from "./effect"
import { toReactive } from "./reactive"

export interface Ref<T = any> {
    value: T
}

/**
 * ref 入口
 * @param value 
 * @returns 
 */
export function ref(value?: unknown) {
    return createRef(value, false)
}

/**
 * 创建一个 RefImpl 对象
 * @param rawValue 
 * @param shallow 
 * @returns 
 */
function createRef(rawValue:unknown, shallow:boolean){
    // 如果 rawValue 是 ref 类型数据，则直接返回
    if(isRef(rawValue)) {
        return rawValue
    }
    return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
    private _value: T
    public dep?: Dep | undefined
    // 是否为 ref 类型数据的标记
    public readonly __v_isRef = true

    constructor(value: T, public readonly __v_isShallow: boolean) {
        // 是否为浅层 ref 类型 若是直接返回值 否则返回 reactive 对象
        this._value = __v_isShallow ? value : toReactive(value)
    }

    get value() {
        // 收集 ref依赖
        trackRefValue(this)
        return this._value
    }

    set value(newVal) {
        this._value = newVal
    }
}
/**
 * 收集 ref 依赖
 * @param ref 
 */
export function trackRefValue(ref: RefImpl<any>) {
    if(activeEffect) {
        trackEffects(ref.dep || (ref.dep = createDep()))
    }
}

export function isRef(value: any): value is Ref {
    return !!(value && value.__v_isRef === true)
}
