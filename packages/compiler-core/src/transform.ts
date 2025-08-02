import { isArray, isString } from "@vue/shared"
import { createObjectProperty, createSimpleExpression, ElementTypes, NodeTypes } from "./ast"
import { isSingleElementRoot } from "./hoistStatic"
import { TO_DISPLAY_STRING } from "./runtimeHelpers"
import { isVSlot } from "./utils"

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
   // 替换当前节点
   replaceNode(node): void
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
        },
        replaceNode(node) {
            context.parent!.children[context.childIndex] = context.currentNode = node
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
            // 如果 onExit 是数组，则将数组中的每个元素添加到 exitFns 中
            if(isArray(onExit)) {
                exitFns.push(...onExit)
            } else {
                exitFns.push(onExit)
            }
        }

        // 因为触发了 replaceNode 方法，可能导致 context.currentNode 发生改变，所以需要在这里校正
        if(!context.currentNode) {
            return
        } else {
            // 节点更换
            node = context.currentNode
        }
    }
    // 继续转化子节点
    switch(node.type) {
        case NodeTypes.IF_BRANCH:
        case NodeTypes.ELEMENT:
        case NodeTypes.ROOT:
            traverseChildren(node, context)
            break
        case NodeTypes.INTERPOLATION: // {{xxx}} 差值表达式
            context.helper(TO_DISPLAY_STRING)
            break
        // v-if 指令
        case NodeTypes.IF:
            // 处理 v-if 指令
            for(let i = 0; i < node.branches.length; i++) {
                const branch = node.branches[i]
                traverseNode(branch, context)
            }
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

/**
 * 创建结构化指令转换函数
 * @param name 指令名称或正则表达式
 * @param fn 转换函数
 * @returns 返回一个转换函数，该函数用于处理节点上的结构化指令
 */
export function createStructuralDirectiveTransform(name:string | RegExp, fn) {
    // s 参数指的是指令名称（directive name）例如：当解析 <div v-if="condition"> 时，s 就是 "if"； 若 name 是字符串，则直接比较，若 name 是正则，则使用正则匹配
    const matches = isString(name) ? (s:string) => s === name : (s:string) => name.test(s)
    return (node, context) => {
        if(node.type === NodeTypes.ELEMENT) {
            const {props} = node
            // 结构转化与 v-slot 无关，所以需要过滤掉 v-slot 指令
            if(node.tagType === ElementTypes.TEMPLATE && props.some(isVSlot)) {
                return
            }
            // 存储转化函数的数组
            const exitFns:any = []
            for(let i = 0; i < props.length; i++) {
                const prop = props[i]
                if(prop.type === NodeTypes.DIRECTIVE && matches(prop.name)) {
                    // 移除指令，避免无限递归
                    props.splice(i, 1)
                    i--
                    const onExit = fn(node, context, prop, i)
                    if(onExit) {
                        exitFns.push(onExit)
                    }
                }
            }
            // 返回 exitFns 数组，数组中存储的是转化函数的返回值，这些返回值是转化函数的退出函数
            return exitFns
        }
    }
}
