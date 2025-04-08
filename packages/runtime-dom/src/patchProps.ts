// 封装 props 操作

import { isOn } from "@vue/shared"
import { patchClass } from "./modules/class"
import { patchAttr } from "./modules/attr"
import { patchDOMProp } from "./modules/props"
import { patchStyle } from "./modules/style"
import { patchEvent } from "./modules/events"

export const patchProp = (el, key, prevValue, nextValue) => {
    if(key === 'class') {
        // class 是字符串可以直接替换 不需要 prevValue
        patchClass(el, nextValue)
    } else if(key === 'style') {
        // style
        patchStyle(el, prevValue,nextValue)
    } else if(isOn(key)) {
        // 事件
        patchEvent(el, key, prevValue, nextValue)
    } else if(shouldSetAsProp(el, key, nextValue)) {
        // 通过 DOM properties 设置
        patchDOMProp(el, key, nextValue)
    } else {
        // 其他属性
        patchAttr(el, key, nextValue)
    }
}

/**
 * 判断是否应该通过 DOM properties 设置
 * @param el 
 * @param key 
 * @param value 
 */
function shouldSetAsProp(el, key, value) {
    // TODO #1787,#2840 表单元素的表单属性是只读的，必须设置为属性为 attribute
    if(key === 'form') {
        return false
    }

    // TODO #1526 必须设置为 attribute
    if(key === 'list' && el.tagName === 'INPUT') {
        return false
    }

    // TODO #2766 必须设置为 attribute
    if(key === 'type' && el.tagName === 'TEXTAREA') {
        return false
    }
    return key in el
}