import { NodeTypes } from "./ast"

/**
 * 文本转换
 */
export function transformText(node, context) {
    if(node.type === NodeTypes.ROOT ||
        node.type === NodeTypes.ELEMENT ||
        node.type === NodeTypes.IF_BRANCH ||
        node.type === NodeTypes.FOR
    ) {
        return () => {}
    }
}