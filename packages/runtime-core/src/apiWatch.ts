import { EMPTY_OBJ, hasChanged, isObject } from "@vue/shared"
import { queuePreFlushCb } from "./scheduler"
import { ReactiveEffect } from "packages/reactivity/src/effect"
import { isReactive } from "packages/reactivity/src/reactive"

/**
 * watch 配置项属性
 */
export interface WatchOptions<Immediate = boolean> {
    immediate?: Immediate
    deep?: boolean
}

/**
 * 指定 watch 函数
 * @param source 监听的响应性数据
 * @param cd 回调函数
 * @param options 配置迹象
 * @returns 
 */
export function watch(source, cb: Function, options?: WatchOptions) {
    return doWatch(source as any,cb, options)
}

function doWatch(
    source,
    cb: Function,
    {immediate, deep}: WatchOptions = EMPTY_OBJ
) {
    let getter: () => any

    if(isReactive(source)) {
        // getter 是一个返回 source 的函数
        getter = () => source
        deep = true
    } else {
        getter = () => {}
    }

    if(cb && deep) {
        const baseGetter = getter
        // 使用 traverse 递归访问触发 source 属性的 getter 方法
        getter = () => traverse(baseGetter())
    }

    let oldValue = {}
    // job 函数
    const job = () => {
        if(cb) {
            const newValue = effect.run()
            if(deep || hasChanged(newValue,oldValue)) {
                cb(newValue,oldValue)
                oldValue = newValue
            }
        }
    }

    let scheduler = () => queuePreFlushCb(job)
    const effect = new ReactiveEffect(getter, scheduler)

    if(cb) {
        if(immediate) {
            // 直接执行一次
            job()
        } else {
            oldValue = effect.run()
        }
    } else {
        effect.run()
    }

    return () => {
        effect.stop()
    }
}

/**
 * 依次执行 getter 从而触发依赖收集
 */
export function traverse(value: unknown) {
    if(!isObject(value)) {
        return value
    }

    for(const key in value as object) {
        traverse((value as any)[key])
    }
    return value 
}