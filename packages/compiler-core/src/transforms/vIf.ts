import { createCallExpression, createConditionalExpression, createObjectProperty, createSimpleExpression, NodeTypes } from "../ast"
import { CREATE_COMMENT } from "../runtimeHelpers"
import { createStructuralDirectiveTransform, TransformContext } from "../transform"
import { getMemoedVNodeCall, injectProp } from "../utils"

/**
 * 处理 v-if 指令
 * @param node 当前节点
 * @param context 上下文
 * @param dir 指令
 * @returns 返回一个转换函数，该函数用于处理节点上的结构化指令
 */
export const transformIf = createStructuralDirectiveTransform(
    /^(if|else|else-if)$/,
    (node, context, dir) => {
       return processIf(node, context, dir, (ifNode, branch, isRoot) => {
        // TODO 目前无需处理兄弟节点情况
        let key = 0

        return () => {
            if(isRoot) {
                ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context)
            } else {
                // TODO 非根节点，需要将当前节点设置为 if 节点
            }
        }
       })
    
})

/**
 * 处理 v-if 指令
 * @param node 当前节点
 * @param context 上下文
 * @param dir 指令
 * @param processCodegen 处理 codegenNode 的函数
 */
export function processIf(node, context:TransformContext, dir, processCodegen?:(node, branch, isRoot: boolean) => (() => void) | undefined) {
    if(dir.name === "if") {
        const branch = createIfBranch(node,dir)
        // 生成 if 指令节点
        const ifNode = {
            type: NodeTypes.IF,
            loc: node.loc,
           branches: [branch],
        }
        // 切换 currentNode 为 ifNode
        context.replaceNode(ifNode)
        // 处理 codegenNode
        if(processCodegen) {
             return processCodegen(ifNode, branch, true)
        }
    }
}


/**
 * 创建 if 指令的 branch 分支
 * @param node 当前节点
 * @param dir 指令
 * @returns 返回一个 if 分支节点
 */
function createIfBranch(node, dir) {
    return {
        type: NodeTypes.IF_BRANCH,
        loc: node.loc,
        condition: dir.exp,
        children: [node],
    }
}


/**
 * 创建 codegenNode 节点
 * @param branch 分支
 * @param keyIndex 键索引
 * @param context 上下文
 * @returns 返回一个 codegenNode 节点
 */
function createCodegenNodeForBranch(branch, keyIndex: number, context: TransformContext) {
    if(branch.condition) {
        return createConditionalExpression(
            branch.condition,
            createChildrenCodegenNode(branch, keyIndex),
            // 以注释的形式展示 v-if
            createCallExpression(context.helper(CREATE_COMMENT), ['"v-if"', 'true'])
        )
    }
    else {
        return createChildrenCodegenNode(branch, keyIndex)
    }
}

/**
 * 创建指定子节点 codegenNode 节点
 * @param branch 分支
 * @param keyIndex 键索引
 * @returns 返回一个子节点 codegenNode 节点
 */
function createChildrenCodegenNode(branch, keyIndex: number) {
    const keyProperty = createObjectProperty(
        `key`,
        createSimpleExpression(
          `${keyIndex}`,
          false,
        )
      )

      const {children} = branch
      const firstChild = children[0]

      const ret = firstChild.codegenNode
      const vnodeCall = getMemoedVNodeCall(ret)

    // 填充 props
    injectProp(vnodeCall, keyProperty)

    return ret
}
