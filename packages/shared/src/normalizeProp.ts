import { isArray, isObject, isString } from "."

export function normalizeClass(value: unknown): string {
    let res = ''
    if(isString(value)) {
        res = value
    }
    // class 数组增强
    else if(isArray(value)) {
        for(let i = 0; i < value.length; i++) {
            // 循环数组里的值 递归获取 class 的值
            const normalized = normalizeClass(value[i])
            if(normalized) {
                res += normalized + ' '
            }
        }
    }
    // class 对象增强
    else if(isObject(value)) {
        for( const name in value as object) {
            // 得到对象的每个 key
            if((value as object )[name]) {
                res += name + ' '
            }
        }
    }
    // 去除字符串左右空格
    return res.trim()
}