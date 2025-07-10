import { NodeTypes } from "./ast"
import { isSingleElementRoot } from "./hoistStatic"

export function transform(root, options) {
    // 创建 transform 上下文
    const context = createTransformContext(root, options)
    // 按照深度优先依次处理 node 节点转化
    traverseNode(root, context)

    // 根节点处理
    createRootCodegen(root)
    root.helpers = [...context.helpers.keys()]
    root.components = []
    root.directives = []
    root.imports = []
    root.exports = []
    root.hoists = []
    root.temps = []
    root.cached = []
}

/**
 * TransformContext 用 interface，因为它描述的是“上下文对象的结构”，而且可能会被多处扩展和合并。
 */
export interface TransformContext {
   // AST 根节点
   root,
   // 当前转换的父节点
   parent:ParentNode | null,
   // 每次转化时记录的子节点索引
   childIndex:number,
   // 当前转换的节点
   currentNode,
   // 辅助创建 JavaScript AST 属性 helpers，该属性是一个 Map，key 为 Symnol（方法名），表示 render 函数中创建 节点的方法
   helpers: Map<symbol,number>,
   helper<T extends symbol>(name:T):T,
   // 转化方法集合
   nodeTransforms: any[],
}

/**
 * 创建 transform 上下文
 */
function createTransformContext(root, {nodeTransforms = []}): TransformContext {
    const context: TransformContext = {
        // options
        root,
        helpers:new Map(),
        currentNode:root,
        parent:null,
        childIndex:0,

        // state
        nodeTransforms,

        // methods
        helper(name) {
            const count = context.helpers.get(name) || 0
            context.helpers.set(name, count + 1)
            return name
        }
    }
    return context
}

function createRootCodegen(root) {
    const {children} = root
    // 仅支持一个根节点处理
    if(children.length === 1) {
        const child = children[0]
        if(isSingleElementRoot(root,child) && child.codegenNode) {
            const codegenNode = child.codegenNode
            root.codegenNode = codegenNode
        }
    }
}

/**
 * 遍历转化节点，转换过程中一定要有深度优先（即：孙 -> 子 -> 父），因为当前节点的状体往往需要根据子节点的情况确定
 * 转化过程分为两个阶段：
 * 1、进入阶段：存储所有节点的转化函数到 exitFns 中
 * 2、退出阶段：执行 exitFns 中缓存的函数，一定是倒叙的，保证处理过程时深度优先
 */
export function traverseNode(node, context) {
    // 通过上下文记录当前正在处理的 node 节点
    context.currentNode = node
    // 获取当前所有 node 节点的 transform 函数
    const {nodeTransforms} = context
    // 存储转化函数的数组
    const exitFns: any = []
    // 遍历 nodeTransforms 数组，将每个转化函数添加到 exitFns 中
    for(let i = 0; i < nodeTransforms.length; i++) {
        const onExit = nodeTransforms[i](node, context)
        if(onExit) {
            exitFns.push(onExit)
        }
    }

    switch(node.type) {
        case NodeTypes.ROOT:
            traverseChildren(node, context)
            break
        case NodeTypes.ELEMENT:
            break
    }

    // 退出阶段
    context.currentNode = node
    let i = exitFns.length
    while(i--) {
        exitFns[i]()
    }
}

/**
 * 循环处理子节点
 * @param node 
 * @param context 
 */
export function traverseChildren(parent, context:TransformContext) {
    const {children} = parent
    if(children) {
        for(let i = 0; i < children.length; i++) {
            const child = children[i]
            context.parent = parent
            context.childIndex = i
            traverseNode(child, context)
        }
    }
}

