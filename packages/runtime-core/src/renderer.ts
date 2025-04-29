import { ShapeFlags } from "packages/shared/src/shapeFlags"
import { Fragment, normalizeChildren, VNode } from "./vnode"
import { EMPTY_OBJ, isSameVNodeType, isString } from "@vue/shared"
import { normalizeVNode, renderComponentRoot } from "./componentRenderUtils"
import { createComponentInstance, setupComponent } from "./component"
import { ReactiveEffect } from "packages/reactivity/src/effect"
import { queuePreFlushCb } from "./scheduler"


export interface RendererOptions {
    // 为指定的 element 的 prop 打补丁
    patchProp(el: Element, key: string, prevValue:any, nextValue:any):void
    // 为指定的 element 设置 text
    setElementText(node: Element, text:string): void
    // 插入指定的 el 到 parent 中，anchor表示插入位置
    insert(el, parent: Element, anchor?): void
    // 创建指定的 element
    createElement(type: string)
    // 创建 Text 节点
    createText(text: string)
    // 设置 text 
    setText(node, text): void
    // 设置注释节点
    createComment(text: string)
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
        createText: hostCreateText,
        setText: hostSetText,
        createComment: hostCreateComment,
        remove: hostRemove
    } = options

    // Element 打补丁
    const processElement = (oldVNode, newVNode, container, anchor) => {
        if(oldVNode == null) {
            // 挂载操作
            mountElement(newVNode, container, anchor)
        } else {
            // 更新操作
            patchElement(oldVNode, newVNode)
        }
    }

    // Text 打补丁  注意：Text 节点属于叶子结点，不存在内部子节点
    const processText = (oldVNode, newVNode, container, anchor) => {
        if (oldVNode == null) {
            // 生成节点 并挂载
            newVNode.el = hostCreateText(newVNode.children as string)
            hostInsert(newVNode.el, container, anchor)
        } else {
            /**
             * 对 oldVnode.el 做非空判断；
             * 赋值给 newVNode.el;
             * 注意：JS 的赋值语句会返回被赋予的值
             */
            const el = (newVNode.el = oldVNode.el!)
            if(newVNode.children !== oldVNode.children) {
                // 更新操作 参数一：目标元素 参数二：Text节点内容
                hostSetText(el, newVNode.children as string)
            }
        }
    }

    // Comment 打补丁
    const processCommentNode = (oldVNode, newVNode, container, anchor) => {
        if(oldVNode == null) {
            // 挂载
            newVNode.el = hostCreateComment((newVNode.children as string) || '')
            hostInsert(newVNode.el, container, anchor)
        } else {
            // 无更新
            newVNode.el  = oldVNode.el
        }
    }

    // Fragment 打补丁：都是对子节点的操作
    const processFragment = (oldVNode, newVNode, container, anchor) => {
        if(oldVNode == null) {
            mountChildren(newVNode.children, container, anchor)
        } else {
            // 对比更新
            patchChildren(oldVNode, newVNode, container, anchor)
        }
    }

    // 组件打补丁
    const processComponent = (oldVNode, newVNode, contianer, anchor) => {
        if(oldVNode == null) {
            // 挂载组件
            mountComponent(newVNode,contianer, anchor)
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

    // 挂载组件
    const mountComponent = (initialVNode, container, anchor) => {
        // 生成组件实例
        initialVNode.component = createComponentInstance(initialVNode)

        const instance = initialVNode.component
        // 标准化组件实例数据
        setupComponent(instance)
        // 设置组件渲染
        setupRenderEffect(instance, initialVNode, container, anchor)
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
                processText(oldVNode, newVNode, container, anchor)
                break;
            case Comment: 
                processCommentNode(oldVNode, newVNode, container,anchor)
                break;
            case Fragment:
                processFragment(oldVNode, newVNode, container, anchor)
                break;
            default:
                if(shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    // 组件
                    processComponent(oldVNode, newVNode, container, anchor)
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

    const mountChildren = (children, container, anchor) => {
        if(isString(children)) {
            children = children.split('')
        } 
        for(let i = 0; i < children.length; i++) {
            const child = (children[i] = normalizeVNode(children[i]))
            patch(null, child, container, anchor)
        }
        
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

    const setupRenderEffect = (instance, initialVNode, container, anchor) => {
        // 组件挂载和更新的方法
        const componentUpdateFn = () => {
            // 挂载之前
            if(!instance.insMounted) {
                // 获取渲染内容
                const subTree = (instance.subTree = renderComponentRoot(instance))

                // 通过 patch 对 subTree 打补丁
                patch(null, subTree, container, anchor)

                // 根节点赋值
                initialVNode.el = subTree.el
            } else {}
        }

        // 创建包含 scheduler 的 effect 实例
        const effect = (instance.effect = new ReactiveEffect(
            componentUpdateFn,
            () => queuePreFlushCb(update)
        ))

        // 生成 update 函数
        const update = (instance.update = () => effect.run())
        // 本质触发 componentUpdateFn
        update() 
    }

    return {
        render
    }
}


