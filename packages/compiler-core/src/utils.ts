import { isString } from "@vue/shared"
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


/**
 * 判断是否为 v-slot
 */
export function isVSlot(node) {
    return node.type === NodeTypes.DIRECTIVE && node.name === "slot"
}

/**
 * 返回 node 节点
 * @param node 
 * @returns 
 */
export function getMemoedVNodeCall(node) {
    return node
}

/**
 * 注入属性 填充 props
 * @param node 
 * @param prop 
 */
export function injectProp(node, prop) {
    let propsWithInjection
    let props = 
        node.type === NodeTypes.VNODE_CALL ? node.props : node.arguments[2]

        if(props == null || isString(props)) {
            propsWithInjection = createObjectExpression([prop])
        }

        if(node.type === NodeTypes.VNODE_CALL) {
            node.props = propsWithInjection
        }
}

/**
 * 创建对象表达式节点
 * @param properties 属性
 * @returns 返回一个对象表达式节点
 */
export function createObjectExpression(properties) {
    return {
        type: NodeTypes.JS_OBJECT_EXPRESSION,
        loc: {},
        properties
    }
}