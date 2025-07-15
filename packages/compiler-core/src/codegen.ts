import { isArray, isString } from "@vue/shared"
import { NodeTypes } from "./ast"
import { CREATE_ELEMENT_VNODE, helperNameMap, TO_DISPLAY_STRING } from "./runtimeHelpers"
import { getVNodeHelper } from "./utils"

const aliasHelper = (s: symbol) => `${helperNameMap[s]}: _${helperNameMap[s]}`
/**
 * 将 JavaScript 代码生成 render 函数
 * @param ast 
 */
export function generate(ast) {
    // 创建代码生成上下文
    const context = createCodegenContext(ast)

    // 获取 code 的拼接方法
    const {push, indent, deindent, newline} = context

    // 生成函数的前置代码
    genFunctionPreamble(context)

    // 生成函数名称和参数
    const functionName = 'render'
    const args = ['_ctx', '_cache']
    const signature = args.join(', ')

    // 利用函数名称和参数生成函数体
    push(`function ${functionName}(${signature}) {`)

    // 缩进 + 换行
    indent()

    // 增加 with 触发
    push('with(_ctx) {')
    indent()

    
    const hasHelpers = ast.helpers.length > 0
    if(hasHelpers) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = _Vue`)
        push('\n')
        newline()
    }

    // 最后拼接 return 语句
    newline()
    push(`return `)

    // 处理 return 结果 如：return _createElementVNode("div", [], ["hello"])
    if(ast.codegenNode) {
        genNode(ast.codegenNode, context)
    } else {
        push(`null`)
    }

    // with 结尾 +反缩进 + 换行
    deindent()
    push('}')

    indent()
    push('}')

    console.log(context.code);
    return {
        ast,
        code: context.code,
    }
    
}

/**
 * 区分节点处理
 * @param node 节点
 * @param context 代码生成上下文
 */
function genNode(node, context) {
    switch(node.type) {
        case NodeTypes.ELEMENT:
            // 处理子节点
            genNode(node.codegenNode!, context)
            break
        case NodeTypes.TEXT:
            genText(node, context)
            break
        case NodeTypes.VNODE_CALL:
            genVNodeCall(node, context)
            break
        // 复合表达式处理
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break
        // 表示处理
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break
        // {{}} 处理
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context)
            break
    }
}

/**
 * 处理文本节点
 * @param node 文本节点
 * @param context 代码生成上下文
 */
function genText(node, context) {
    context.push(JSON.stringify(node.content), node)
}

/**
 * 处理 VNode_CALL 节点
 * @param node VNode_CALL 节点
 * @param context 代码生成上下文
 */
function genVNodeCall(node, context) {
    const {push, helper} = context
    const {tag, props, children, patchFlag, dynamicProps, isComponent} = node

    // 返回 vnode 生成函数
    const callHelper =  getVNodeHelper(context.inSSR, isComponent)
    // console.log(helper(CREATE_ELEMENT_VNODE));
    push(helper(callHelper) + '(', node)

    // 获取函数参数
    const args = genNullableArgs([tag, props, children, patchFlag, dynamicProps])

    // 参数填充
    genNodeList(args, context)

    push(')')
    
}

/**
 * 处理 createXXXVNode 函数参数
 * @param args 参数
 * @returns 可空参数
 */
function genNullableArgs(args: any[]) {
    let i = args.length
    while(i--) {
        if(args[i] !== null) {
            break
        }
    }
    return args.slice(0, i + 1).map(a => a || 'null')
}


/**
 * 创建代码生成上下文
 * @param ast 抽象语法树
 */
function createCodegenContext(ast) {
    const context = {
        // render 函数代码字符串
        code: '',
        // 运行时全局变量名
        runtimeGlobalName: 'Vue',
        // 模版源
        source: ast.loc.source,
        // 缩进级别
        indentLevel: 0,
        // 需要触发的方法，关联 JavaScript AST 的属性 helpers
        helper(key) {
            return `_${helperNameMap[key]}`
        },
        // 插入代码
        push(code) {
            context.code += code
        },
        // 换行
        newline() {
            newline(context.indentLevel)
        },
        // 缩进 + 换行
        indent() {
            newline(++context.indentLevel)
        },
        // 反缩进 + 换行
        deindent() {
            newline(--context.indentLevel)
        },
    }

    function newline(n) {
        context.code += '\n' + ' '.repeat(n)
    }

    return context
}

/**
 * 生成函数前置代码
 * @param context 
 */
function genFunctionPreamble(context) {
    const {push, newline, runtimeGlobalName} = context

    const VueBinding = runtimeGlobalName
    push(`const _Vue = ${VueBinding}\n`)

    newline()
    push(`return `)
}

/**
 * 处理参数填充
 * @param nodes 节点列表
 * @param context 代码生成上下文
 */
function genNodeList(nodes, context) {
    const {push, newline} = context
    for(let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        // 字符串直接拼接
        if(isString(node)) {
            push(node)
        } else if (isArray(node)) {
            // 数组需要 push "[" 和 "]"
            genNodeListAsArray(node, context)
        } else {
            // 对象需要区分 node 节点类型，递归处理
            genNode(node, context)
        }
        if(i < nodes.length - 1) {
            push(', ')
        }
    }
}

function genNodeListAsArray(nodes, context) {
    context.push('[')
    genNodeList(nodes, context)
    context.push(']')
}

function genCompoundExpression(node, context) {
    for(let i = 0; i < node.children!.length; i++) {
        const child = node.children![i]
        if(isString(child)) {
            context.push(child)
        } else {
            genNode(child, context)
        }
    }
}

function genInterpolation(node, context) {
    const {push, helper} = context
    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content, context)
    push(')')
}

function genExpression(node, context) {
   const {content, isStatic} = node
   context.push(isStatic ? JSON.stringify(content) : content, node)
}


