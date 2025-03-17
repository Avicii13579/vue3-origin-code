// 封装 props 操作

import { isOn } from "@vue/shared"
import { patchClass } from "./modules/class"

export const patchProp = (el, key, prevValue, nextValue) => {
    if(key === 'class') {
        patchClass(el, nextValue)
    } else if(key === 'style') {
        // style
    } else if(isOn(key)) {
        // 事件
    } else {
        // 其他属性
    }
}