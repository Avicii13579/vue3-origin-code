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
    },
    // 创建指定 Text 元素
    createText: (text) => doc.createTextNode(text),
    // 设置 text
    setText: (node, text) => {
        node.nodeValue = text
    },
    // 创建指定 Comment 元素
    createComment: (text) =>  doc.createComment(text),
    // 删除指定元素: 需要获取起父级元素
    remove: (el) => {
        const parent = el.parentNode
        if(parent) {
            parent.removeChild(el)
        }
    }
}