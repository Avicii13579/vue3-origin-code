import { ShapeFlags } from "packages/shared/src/shapeFlags"
import { createVNode } from "./vnode"

// 标准化 VNode
export function normalizeVNode(child) {
    if(typeof child === 'object') {
        return cloneIfMounted(child)
    } else {
        return createVNode(Text, null, String(child))
    }
}

// clone VNode
function cloneIfMounted(child) {
    return child
}

// 解析 render 函数的返回值
export function renderComponentRoot(instance) {
    // 因为存在 with 平接插值表达式，需要保证 data 不为 undefined
    const {vnode, render, data = {}} = instance

    let result
    try {

        // 按位与 思路：在 Vue 的虚拟 DOM 实现中，每个 vnode 都有一个 shapeFlag 属性，它是一个位掩码，用于标识该节点的类型和特性。
        // 当使用 & 操作符时，如果结果为非零值，表示该 vnode 确实具有 STATEFUL_COMPONENT 这个特性。
        if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) { 
            // 修改 render 的 this，并获取返回值, 传入 data 对象作为上下文；如果 render 中使用了 this，则需要改变 this 指向
            result = normalizeVNode(render!.call(data, data))
        }
    } catch (err) {
        console.log(err);
        
    }
    return result
}