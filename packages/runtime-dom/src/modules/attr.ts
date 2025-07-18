// 设置元素属性
export function patchAttr(el: Element,key:string,value:string | null) {
    if(value == null) {
        el.removeAttribute(key)
    } else {
        el.setAttribute(key, value)
    }
}