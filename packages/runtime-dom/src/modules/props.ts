// 通过 DOM Properties 指定属性
export function patchDOMProp(el, key, value) {
    try {
        el[key] = value
    } catch(e) {
        console.error(e)
    }
}