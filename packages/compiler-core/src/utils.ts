import { NodeTypes } from "./ast"
import { CREATE_ELEMENT_VNODE, CREATE_VNODE } from "./runtimeHelpers"

export function isText(node) {
    return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
}

/**
 * 获取 VNode 生成函数
 * @param ssr 是否是 SSR
 * @param isComponent 是否是组件
 * @returns 
 */
export function getVNodeHelper(ssr: boolean, isComponent: boolean) {
    // 类型一致：如果 helpers 用的是 Symbol，查找时也要用 Symbol，不能用字符串。
    // 比如：helper(CREATE_ELEMENT_VNODE)，而不是 helper("CREATE_ELEMENT_VNODE")。
    return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
}
