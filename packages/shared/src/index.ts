export const isArray = Array.isArray
// 判断是否为一个对象
export const isObject = (value:unknown) => value !== null && typeof value === 'object'