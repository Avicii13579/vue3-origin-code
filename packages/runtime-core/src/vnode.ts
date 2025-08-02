import { isArray, isFunction, isObject, isString } from "@vue/shared"
import { normalizeClass } from "packages/shared/src/normalizeProp"
import { ShapeFlags } from "packages/shared/src/shapeFlags"

export interface VNode {
    __v_isVNode: true
    type: any
    props: any
    children: any
    shapeFlag:number
    key: any
}

// 用 Symbol 创建唯一标识符
export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')
export const Comment = Symbol('Comment')

export function isVNode(value:any): value is VNode {
    return value ? value.__v_isVNode === true : false
}

/**
 * 生成 VNode 对象并返回
 * @param type node.type
 * @param props 标签属性或自定义属性
 * @param children 子节点
 * @returns vnode 对象
 */
export function createVNode(type: any, props?: any, children?: any): VNode {
   const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0

   if(props) {
    let {class: klass, style} = props
    if(klass && !isString(klass)) {
        props.class = normalizeClass(klass)
    }
   }
   return createBaseVNode(type, props, children, shapeFlag)
}

/**
 * 构建基础的 vnode
 * @param type 
 * @param props 
 * @param children 
 * @param shapeFlag 
 * @returns 
 */
export function createBaseVNode(type, props, children, shapeFlag) {
    const vnode = {
        __v_isVNode: true,
        type,
        props,
        shapeFlag,
        key: props?.key || null
    } as VNode

    normalizeChildren(vnode, children)
    return  vnode
}

/**
 * 
 * @param vnode 
 * @param children 
 */
export function normalizeChildren(vnode: VNode, children: unknown) {
    let type = 0
    if(children == null) {
        children = null
    } else if(isArray(children)) {
        type = ShapeFlags.ARRAY_CHILDREN // 数组子节点位运算后为 16
    } else if(typeof children === 'object') {

    } else if(isFunction(children)) {

    } else {
        children = String(children)
        type = ShapeFlags.TEXT_CHILDREN
    }

    vnode.children = children
    vnode.shapeFlag |= type 
    /**
     * Element 1 按位或 子节点为 Array 16  = 17 下面这个 vnode 的 shapeFlag 为 17
     * const vnode = h('div', { class: 'test' }, [
        h('p', 'p1'),
        h('p', 'p2'),
        h('p', 'p3')
      ])
     */
}

/**
 * 创建注释节点
 * @param text 注释文本
 * @returns 注释节点
 */
export function createCommentVNode(text: string) {
    return createVNode(Comment, null, text)
}

export {createVNode as createElementVNode}