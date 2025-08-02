import { isString } from "@vue/shared"
import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers"

export const enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION,
  INTERPOLATION,
  ATTRIBUTE,
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION,
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL,
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION,
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,

  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT
}

export const enum ElementTypes {
  // 元素
  ELEMENT,
  // 组件
  COMPONENT,
  // 插槽
  SLOT,
  // 模板
  TEMPLATE
}

/**
 * 创建根节点
 * @param children 子节点
 * @returns 根节点
 */
export function createRoot(children) {
  return {
      type: NodeTypes.ROOT,
      children,
      // 位置信息，不影响渲染
      loc:{}
  }
}

export function createVNodeCall(context, tag, props, children) {
  if(context) {
    context.helper(CREATE_ELEMENT_VNODE)
  }

  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children
  }
}

export function createCompoundExpression(children, loc) {
  return {
    type: NodeTypes.COMPOUND_EXPRESSION,
    children,
    loc
  }
}

/**
 * 创建简单表达式节点
 * @param content 表达式内容
 * @param isStatic 是否静态
 * @returns 返回一个简单表达式节点
 */
export function createSimpleExpression(content, isStatic) {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic,
    loc: {}
  }
}

/**
 * 创建对象属性节点
 * @param key 属性名
 * @param value 属性值
 * @returns 返回一个对象属性节点
 */
export const createObjectProperty = (key, value) => {
  return {
    type: NodeTypes.JS_PROPERTY,
    loc: {},
    key: isString(key) ?  createSimpleExpression(key, true) : key ,
    value
  }
}

/**
 * 创建条件表达式
 * @param test 条件
 * @param consequent 条件为真时的表达式
 * @param alternate 条件为假时的表达式
 * @param newline 是否换行
 * @returns 返回一个条件表达式
 */
export function createConditionalExpression(test, consequent, alternate, newline = true) {
  return {
      type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
      test,
      consequent,
      alternate,
      newline,
      loc: {}
  }
}

/**
 * 创建 JS 调用表达式的节点
 * @param callee 调用表达式
 * @param args 参数
 * @returns 返回一个 JS 调用表达式
 */
export function createCallExpression(callee, args) {
  return {
      type: NodeTypes.JS_CALL_EXPRESSION,
      loc: {},
      callee,
      arguments: args
  }
}
