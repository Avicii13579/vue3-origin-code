import { ShapeFlags } from "packages/shared/src/shapeFlags"

export interface RendererOptions {
    // 为指定的 element 的 prop 打补丁
    patchProp(el: Element, key: string, prevValue:any, nextValue:any):void
    // 为指定的 element 设置 text
    setElementText(node: Element, text:string): void
    // 插入指定的 el 到 parent 中，anchor表示插入位置
    insert(el, parent: Element, anchor?): void
    // 创建指定的 element
    createElement(type: string)
}
// 创建渲染器
export function createRenderer(options: RendererOptions) {
    return baseCreateRenderder(options)
}

/**
 * 生成 renderer 渲染器
 * @param options 兼容性操作配置对象
 */
function baseCreateRenderder(options: RendererOptions):any {
    // 解构 options
    const {
        insert: hostInsert,
        patchProp: hostPatchProp,
        createElement: hostCreateElement,
        setElementText: hostSetElementText
    } = options

 // Element 打补丁操作
const processElement = (oldVNode, newVNode, container, anchor) => {
    if(oldVNode == null) {
        mountElement(newVNode, container, anchor)
    } else {
        // TODO 更新操作
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

        const {shapeFlag, type} = newVNode
        switch(type) {
            const Text:
                break
            const Comment: 
            break
            const Fragment:
            break
            default:
                if(shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {

                }

        }
    }

    const render = (vnode, container) => {
        if(vnode == null) {
            // TODO 卸载
        } else {
            // 打补丁（包括更新和挂载）
            patch(container._vnode || null, vnode, container)
        }
        container._vnode = vnode
    }
    return {
        render
    }
}



