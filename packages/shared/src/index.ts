import { VNode } from "packages/runtime-core/src/vnode"

export const isArray = Array.isArray
// 判断是否为一个对象
export const isObject = (value:unknown) => value !== null && typeof value === 'object'
// 判断两个值是否相等 发生改变后返回 true 可同时判断基本类型和引用类型
export const hasChanged = (value:any, oldValue:any): boolean => !Object.is(value, oldValue)
// 是否为一个 function 
export const isFunction = (val: unknown): val is Function => typeof val === 'function'
export const isString = (val: unknown): val is string => typeof val === 'string'
// 合并对象
export const extend = Object.assign


// 判断是否为 on 开头
const onRE = /^on[^a-z]/
export const isOn = (key: string) => onRE.test(key)

// 判断是否为同类型节点
export const isSameVNodeType = (n1: VNode, n2: VNode) => {
    return n1.type === n2.type && n1.key === n2.key
}

// 只读空对象
export const EMPTY_OBJ: {readonly [key:string]:any} = {}
// 空数组
export const EMPTY_ARR = []