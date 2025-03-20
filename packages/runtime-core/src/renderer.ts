import { ShapeFlags } from "packages/shared/src/shapeFlags"
import { Fragment, VNode } from "./vnode"
import { EMPTY_OBJ, isSameVNodeType } from "@vue/shared"


export interface RendererOptions {
    // 为指定的 element 的 prop 打补丁
    patchProp(el: Element, key: string, prevValue:any, nextValue:any):void
    // 为指定的 element 设置 text
    setElementText(node: Element, text:string): void
    // 插入指定的 el 到 parent 中，anchor表示插入位置
    insert(el, parent: Element, anchor?): void
    // 创建指定的 element
    createElement(type: string)
    // 卸载元素
    remove(el): void
}
// 创建渲染器
/**
 * 注意：传入的 options 必须包含 RendererOptions 的所有属性
 *  Partial<RendererOptions> 可以只包含部分属性
 * @param options 这个 options 从 packages/runtime-dom/src/index.ts 传入，属性是 nodeOps 和 patchProps 的合并对象
 * @returns 
 */
export function createRenderer(options: RendererOptions) {
    return baseCreateRenderer(options)
}

/**
 * 生成 renderer 渲染器
 * @param options 兼容性操作配置对象
 */
function baseCreateRenderer(options: RendererOptions):any {
    // 解构 options
    const {
        insert: hostInsert,
        patchProp: hostPatchProp,
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        remove: hostRemove
    } = options

    // Element 打补丁操作
    const processElement = (oldVNode, newVNode, container, anchor) => {
        if(oldVNode == null) {
            // 挂载操作
            mountElement(newVNode, container, anchor)
        } else {
            // 更新操作
            patchElement(oldVNode, newVNode)
        }
    }

    // 挂载元素
    const mountElement = (vnode, container, anchor) => {
        const {type, props, shapeFlag} = vnode

        // 创建 element
        const el = (vnode.el = hostCreateElement(type))

        if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 设置为文本节点
            hostSetElementText(el, vnode.children as string)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 设置为数组节点

        }

        // 处理 props
        if(props) {
            for(const key in props) {
                hostPatchProp(el, key, null, props[key])
            }
        }

        // 插入 el 到指定位置
        hostInsert(el, container, anchor)
    }

    const patch = (oldVNode, newVNode, container, anchor = null) => {
        if(oldVNode === newVNode) {
            return
        }

        // 判断若不是相同类型的节点，则卸载旧节点
        if(oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
            unmount(oldVNode)
            oldVNode = null
        }

        const {shapeFlag, type} = newVNode
        switch(type) {
            case Text:
                break;
            case Comment: 
                break;
            case Fragment:
                break;
            default:
                if(shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {

                }

        }
    }

    const render = (vnode, container) => {
        if(vnode == null) {
            // 卸载
            if(container._vnode) {
                unmount(container._vnode)
            }
        } else {
            // 打补丁（包括更新和挂载）
            patch(container._vnode || null, vnode, container)
        }
        container._vnode = vnode
    }

    const unmount = (vnode) => {
        hostRemove(vnode.el!) // 确保 el 存在
    }

    // 对比节点 进行更新操作
    const patchElement = (oldVNode, newVNode) => {
        // 获取旧的 DOM元素，复用这个 DOM 给新的虚拟节点 el 属性赋值；同时将这个
        const el = (newVNode.el = oldVNode.el)
        const oldProps = oldVNode.props || EMPTY_OBJ
        const newProps = newVNode.props || EMPTY_OBJ

        // 更新子节点
        patchChildren(oldVNode, newVNode, el, null)

        // 更新 props
        patchProps(el, newVNode, oldProps, newProps)
    }
        
    const patchChildren = (oldVNode, newVNode, container, anchor) => {
        // 旧节点
        const c1 = oldVNode && oldVNode.children
        const  prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
        // 新节点
        const c2 = newVNode.children
        const {shapeFlag} = newVNode

        // 新节点是文本节点
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧节点是数组节点
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // TODO 卸载旧节点的子节点
            }
            // 若 c1 不等于 c2 guagua
            if(c1 !== c2) {
                // 设置为文本节点
                hostSetElementText(container, c2 as string)
            }
        } else {
            // 旧节点是数组节点
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 新节点是是数组节点
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // TODO 进行 diff 计算
                } else {
                    // TODO 卸载节点

                }
            } else {
                // 旧节点为 Text_CHILDREN
                if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    // 删除旧节点的文本
                    hostSetElementText(container, '')
                }
                // 新节点为 ARRAY_CHILDREN
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // TODO 单独挂载新子节点操作
                }
            } 
        }
    }

    // 为 props 打补丁
    const patchProps = (el: Element, vnode, oldProps, newProps) => {
        if(oldProps !== newProps) {
            // 1、遍历新的 props 赋值
            for(const key in newProps) {
                const prev = oldProps[key]
                const next = newProps[key]
                if(prev !== next) {
                    hostPatchProp(el, key, prev, next)
                }
            }

            // 遍历旧的 props 若新的里面不存在，则删除
            for(const key in oldProps) {
                if(!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null)
                }
            }
        }
    }

    return {
        render
    }
}



