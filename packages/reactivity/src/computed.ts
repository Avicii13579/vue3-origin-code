import { ReactiveEffect } from "./effect"
import { Dep } from "./dep"
import { trackRefValue, triggerRefValue } from "./ref"
import { isFunction } from "@vue/shared"

/**
 * 计算属性类
 */
export class ComputedRefImpl<T> {
    public dep?: Dep = undefined
    // 脏：为 false 时，表示会触发依赖；为 true 时表示会重新执行 run 方法获取数据
    public _dirty = true
    private _value!: T

    public readonly effect: ReactiveEffect<T>

    public readonly __v_isRef = true

    constructor(getter) {
        this.effect = new ReactiveEffect(getter,() => {
            if(!this._dirty) {
                this._dirty = true
                triggerRefValue(this)
            }
        })
        this.effect.computed = this
    }
    get value() {
        // 收集依赖
        trackRefValue(this as any)
        // 初始化后 默认为 true
        if(this._dirty) {
            // 惰性求值？
            this._dirty = false
            // 会重新计算值
            this._value = this.effect.run()!
        }
        return this._value
    }
}

/**
 * 计算属性
 * @param getterOrOptions 
 * @returns 
 */
export function computed(getterOrOptions) {
    let getter
    // computed 传过来的匿名函数
    const onlyGetter = isFunction(getterOrOptions)
    if(onlyGetter) {
        // 如果是函数赋值给 getter
        getter = getterOrOptions
    }
    const cRef = new ComputedRefImpl(getter)

    return cRef as any
}