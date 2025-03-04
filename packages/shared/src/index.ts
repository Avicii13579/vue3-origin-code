export const isArray = Array.isArray
// 判断是否为一个对象
export const isObject = (value:unknown) => value !== null && typeof value === 'object'
// 判断两个值是否相等 发生改变后返回 true 可同时判断基本类型和引用类型
export const hasChanged = (value:any, oldValue:any): boolean => !Object.is(value, oldValue)
// 是否为一个 function 
export const isFunction = (val: unknown): val is Function => typeof val === 'function'
// 合并对象
export const extend = Object.assign
// 只读空对象
export const EMPTY_OBJ: {readonly [key:string]:any} = {}