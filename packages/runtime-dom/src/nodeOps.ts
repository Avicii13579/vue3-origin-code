// 封装 element 操作
const doc = document

export const nodeOps = {
    // 插入元素到指定位置
    insert:(child, parent, anchor) => {
        parent.insertBefore(child, anchor || null)
    },
    // 创建指定的 Element
    createElement: (tag): Element => {
        const el = doc.createElement(tag)
        return el
    },
    // 为指定的 element 设置 textContent
    setElementText: (el, text) => {
        el.textContent = text
    }
}