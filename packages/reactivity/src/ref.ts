import { hasChanged } from "@vue/shared"
import { createDep, Dep } from "./dep"
import { activeEffect, trackEffects, triggerEffects } from "./effect"
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
    private _rawValue: T
    public dep?: Dep | undefined
    // 是否为 ref 类型数据的标记
    public readonly __v_isRef = true

    constructor(value: T, public readonly __v_isShallow: boolean) {
        // 是否为浅层 ref 类型 若是直接返回值 否则返回 reactive 对象
        this._value = __v_isShallow ? value : toReactive(value)
        // 存储原始数据
        this._rawValue = value
    }

      // 通过 get 和 set 标识将 value 函数可以通过属性的方式调用触发
    get value() {
        // 收集 ref依赖
        trackRefValue(this)
        // 若非复杂对象会触发对应的 Proxy 的 get 方法
        return this._value
    }

    set value(newVal) {
        /**
         * newVal 为新数据  
         * this._rawValue 为原始数据
         * 对比数据是否发生变化
         */
        if(hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal
            // 对修改为复杂类型数据进行判断
            this._value = toReactive(newVal)
            triggerRefValue(this)
        }
    }
}
/**
 * 为 ref 的 value 进行触发依赖
 * @param ref 
 */
export function triggerRefValue(ref) {
    if(ref.dep) { //判断是否存在和该属性绑定的依赖函数
        triggerEffects(ref.dep)
    }
}
/**
 * 收集 ref 依赖
 * @param ref 
 */
export function  trackRefValue(ref: RefImpl<any>) {
    if(activeEffect) {
        trackEffects(ref.dep || (ref.dep = createDep()))
    }
}

export function isRef(value: any): value is Ref {
    return !!(value && value.__v_isRef === true)
}
