import { createRoot, ElementTypes, NodeTypes } from "./ast"

/**
 * 基础的 parse 方法，生成 AST
 */
export function baseParse(content:string) {
    // 创建 parser 对象，为解析器的上下文（template 模板）
    const context = createParserContext(content)
    const children = parseChildren(context, [])
    console.log(context,children)
    return createRoot(children)
}



/**
 * 创建解析器上下文
 */
export interface ParserContext {
    source:string
}
function createParserContext(content:string): ParserContext {
    return {
        source:content
    }
}

/**
 * 处理子节点
 */
function parseChildren(context:ParserContext, ancestors:any[]) {
    console.log(context, ancestors)
    // 存放所有 node 节点的数组
    const nodes = []
    // 循环解析所有 node 节点
    while(!isEnd(context, ancestors)) {
        const s = context.source
        let node
        if(startsWith(s, '{{')) {
            node = parseInterpolation(context)
            console.log('node:', node)
        } else if(s[0] === '<') {
            // 解析开始标签
            if(/[a-z]/i.test(s[1])) {
                // 解析开始标签
                node = parseElement(context, ancestors)
            }
        }

        // 若以上两个 if 没进入，则我们可以认为它是文本节点
        if(!node) {
            node = parseText(context)
        }

        pushNode(nodes, node)
    }

    return nodes
}

/**
 * 判断 source 是否以 searchString 开头
 * @param source 源字符串
 * @param searchString 搜索字符串
 * @returns 是否以 searchString 开头
 */
function startsWith(source:string, searchString:string): boolean {
    return source.startsWith(searchString)
}

/**
 * 判断是否结束
 */
function isEnd(context:ParserContext, ancestors:any[]): boolean {
    const s = context.source
    if(startsWith(s, '</')) {
       for(let i = ancestors.length - 1; i >= 0; i--) {
        const tag = ancestors[i].tag
        if(startsWithEndTagOpen(s, tag)) {
            return true
        }
       }
    }
    return !s
}

/**
 * 判断 source 是否以 </tag 开头
 */
function startsWithEndTagOpen(source:string, tag:string): boolean {
    return (
        startsWith(source, '</') &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
        /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
    )
}

/**
 * 将 node 节点推入 nodes 数组
 */
function pushNode(nodes:any[], node:any) {
    nodes.push(node)
}


const enum TagType {
    Start,
    End
  }
/**
 * 解析元素
 * @param context 上下文
 * @param ancestors 栈
 * @returns 元素
 */
function parseElement(context:ParserContext, ancestors) {
    // 先处理标签
    const element = parseTag(context, TagType.Start)

    // 处理子节点
    ancestors.push(element)
    // 触发 parseChildren 方法，解析子节点
    const children = parseChildren(context, ancestors)
    ancestors.pop()
    // 将子节点赋值给元素
    element['children'] = children

    // 处理结束标签
    if(startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, TagType.End)
    }
    return element
}   

// 解析标签
function parseTag(context:ParserContext, type:TagType) {
    // 解析开始标签
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)!
    // 获取标签名
    const tag = match[1]
   
    // 对模版进行解析处理
    advanceBy(context, match[0].length)

    // 属性与指令处理 如：v-if
    advanceSpaces(context)
    let props = parseAttributes(context, type)

    // 处理结束标签部分

    // 判断是否为自闭和标签
    let isSelfClosing = startsWith(context.source, '/>')
    advanceBy(context, isSelfClosing ? 2 : 1)

    // 标签类型
    let tagType = ElementTypes.ELEMENT

    return {
        type: NodeTypes.ELEMENT,
        tag,
        tagType,
        props, // 属性
        // children: []
    }

}

/**
 * 截取 source 字符串, 多次调用，逐步处理 template 里的 token
 * @param context 上下文
 * @param numberOfCharacters 截取的长度
 */
function advanceBy(context:ParserContext, numberOfCharacters:number) {
   const {source} = context
   // 截取 source 字符串
   context.source = source.slice(numberOfCharacters)
}

/**
 * 解析文本
 * @param context 上下文
 * @returns 文本
 */
function parseText(context:ParserContext) {
    // 定义普通文本的结束标记
    let endTokens = ['<', '{{']
    let endIndex = context.source.length
    // 精准计算 endIndex，从 context.source 中找到 < 或 {{ 的下标索引，取最小值为 endIndex
    for(let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i])
        if(index !== -1 && endIndex > index) {
            endIndex = index
        }
    }
    // 获取处理的文本内容
    const content = parseTextData(context, endIndex)

    return {
        type: NodeTypes.TEXT,
        content
    }
}

/**
 * 从指定位置截取文本数据
 * @param context 上下文
 * @param length 截取的长度
 * @returns 截取的文本内容
 */
function parseTextData(context:ParserContext, length:number) {
    // 获取指定文本数据
    const rawText = context.source.slice(0, length)
    // 截取后，更新 context.source
    advanceBy(context, length)
    return rawText
}

/**
 * 解析插值表达式 {{xxx}}
 * @param context 上下文
 * @returns 插值
 */
function parseInterpolation(context:ParserContext) {
    
    // open = {{  close = }}
    const [open, close] = ['{{', '}}']

    advanceBy(context, open.length)

    // 获取差值表达式的中间值
    const closeIndex = context.source.indexOf(close, open.length)
    const preTrimContent = parseTextData(context, closeIndex)
    const content = preTrimContent.trim()
    advanceBy(context, close.length)

    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            isStatic: false,
            content
        }
    }
}

/**
 * 处理 div v-if 之间的空格
 * @param context 上下文
 */
function advanceSpaces(context:ParserContext): void {
    const match = /^[\t\r\n\f ]+/.exec(context.source)
    if (match) {
      advanceBy(context, match[0].length)
    }
}

/**
 * 解析属性与指令
 * @param context 上下文
 * @param type 标签类型
 * @returns 属性与指令
 */
function parseAttributes(context:ParserContext, type:TagType) {
    // 解析后的 props 数组
    const props:any = []
    // 属性名数组
    const attributeNames = new Set<string>()

    // 循环解析，直到解析道标签结束 ('>' || '/>')
    while(
        context.source.length > 0 &&
        !startsWith(context.source, '>') &&
        !startsWith(context.source, '/>')
    ) {
        const attr = parseAttribute(context, attributeNames)
        if(type === TagType.Start) {
            // 将属性名添加到属性名数组中
            props.push(attr)
        }
        advanceSpaces(context)
    }
    return props
}

/**
 * 解析属性与指令
 * @param context 上下文
 * @param nameSet 属性名集合
 * @returns 属性与指令
 */
function parseAttribute(context: ParserContext, nameSet: Set<string>) {
    // 解析属性名
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)!
    const name = match[0]
    // 将属性名添加到属性名集合中
    nameSet.add(name)

    // 截取属性名后的内容
    advanceBy(context, name.length)

    // 解析属性值
    let value:any = undefined

    // 解析模版 获取对应属性节点的值
    if(/^[\t\r\n\f ]*=/.test(context.source)) {
        advanceSpaces(context)
        // 截取属性值
        advanceBy(context, 1)
        advanceSpaces(context)
        // 解析属性值
        value = parseAttributeValue(context)
    }

    // 针对 v- 指令的处理
    if(/^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
        const match =
        /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(
          name
        )!

        // 获取指令名称 v-if 则获取 if
        let dirName = match[1]
        // 获取指令参数 v-if="xxx" 则获取 xxx
        // let arg: any
        // 获取指令修饰符 v-if:xxx 则获取 xxx
        // let modifiers = match[3] ? match[3].slice(1).split('.') : []

        return {
            type: NodeTypes.DIRECTIVE,
            name: dirName,
            arg: undefined,
            modifiers: undefined,
            exp: value && {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: value.content,
                isStatic: false,
                loc: value.loc
            },
            loc: {
            }
           
        }
    }

    return {
        type: NodeTypes.ATTRIBUTE,
        name,
        value: value && {
            type: NodeTypes.TEXT,
            content: value.content,
            loc: value.loc
        },
        loc: {}
    }
}

function parseAttributeValue(context:ParserContext) {
    let content = ''

    // 判断是单引号还是双引号
    const quote = context.source[0]
    const isQuoted = quote === `"` || quote === `'`

    if(isQuoted) {
        // 截取属性值
        advanceBy(context, 1)
        // 获取结束的 index
        const endIndex = context.source.indexOf(quote)

        // 如果存在结束的 index，则截取属性值 如：v-if="xxx" 则截取 xxx
        if(endIndex !== -1) {
            content = parseTextData(context, endIndex)
            // 截取属性值
            advanceBy(context, 1)
        } else {
            content = parseTextData(context, context.source.length)
        }
    } 
    return {
        content,
        isQuoted,
        loc: {}
    }
}