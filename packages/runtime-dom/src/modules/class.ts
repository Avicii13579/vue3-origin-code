export function patchClass(el: Element, value: string | null) {
    if(value == null) {
        el.removeAttribute('class')
    } else {
        // TODO 若存在多个 class 会全部存在 value 里吗？
        el.className = value 
    }
}