import { createVNodeCall, NodeTypes } from "../ast"

/**
 * 元素转换
 */
export function transformElement(node, context) {
    return function postTransformElement() {
        node = context.currentNode!

        // 只处理元素节点
        if(node.type !== NodeTypes.ELEMENT) {
            return
        }

        const {tag} = node
        let vnodeTag = `"${tag}"`
        let vnodeProps = []
        let vnodeChildren = node.children

        node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren)
    }
}