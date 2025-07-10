import { createCompoundExpression, NodeTypes } from "../ast"
import { isText } from "../utils"

/**
 * 将相邻的文本节点和表达式合并为一个表达式
 * 
 * 例如：
 * <div>hello{{name}}</div>
 * 上述模版包含两个节点：
 * 1、文本节点：hello
 * 2、INTERPOLATION 表达式节点：{{name}}
 * 这两个节点生成 render 函数时，需要被合并：'hello' + _toDisplayString(_ctx.msg)
 * 那么在合并时就要多出来 + 符号
 * 例如：
 * children: [
 *  { TEXT 文本节点 },
 *  " + ",
 *  { type: NodeTypes.INTERPOLATION }
 * ]
 */
export function transformText(node, context) {
    if(node.type === NodeTypes.ROOT ||
        node.type === NodeTypes.ELEMENT ||
        node.type === NodeTypes.IF_BRANCH ||
        node.type === NodeTypes.FOR
    ) {
        return () => {
            // 获取所有子节点
            const children = node.children
            // 当前容器
            let currentContainer
            // 遍历所有子节点
            for(let i = 0; i < children.length; i++) {
                const child = children[i]
                if(isText(child)) {
                    // j = i + 1 表示从当前节点的下一个节点开始遍历
                    for(let j = i + 1; j < children.length; j++) {
                        const next = children[j]
                        if(isText(next)) {
                            if(!currentContainer) {
                                currentContainer = children[i] = createCompoundExpression(
                                    [child],
                                    child.loc,
                                )
                                // 在当前节点 child 和下一个节点 next 之间插入 + 符号
                                currentContainer.children.push(' + ', next)
                                // 删除下一个节点
                                children.splice(j, 1)
                                j--
                            } else {
                                currentContainer = undefined
                                break
                            }
                        }
                    }

                }
            }
        }
    }
}