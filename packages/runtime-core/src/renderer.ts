import { ShapeFlags } from "packages/shared/src/shapeFlags"
import { Fragment, normalizeChildren, VNode } from "./vnode"
import { EMPTY_OBJ, isSameVNodeType, isString } from "@vue/shared"
import { normalizeVNode, renderComponentRoot } from "./componentRenderUtils"
import { createComponentInstance, setupComponent } from "./component"
import { ReactiveEffect } from "packages/reactivity/src/effect"
import { queuePreFlushCb } from "./scheduler"


export interface RendererOptions {
    // 为指定的 element 的 prop 打补丁
    patchProp(el: Element, key: string, prevValue: any, nextValue: any): void
    // 为指定的 element 设置 text
    setElementText(node: Element, text: string): void
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
function baseCreateRenderer(options: RendererOptions): any {
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
        if (oldVNode == null) {
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
            if (newVNode.children !== oldVNode.children) {
                // 更新操作 参数一：目标元素 参数二：Text节点内容
                hostSetText(el, newVNode.children as string)
            }
        }
    }

    // Comment 打补丁
    const processCommentNode = (oldVNode, newVNode, container, anchor) => {
        if (oldVNode == null) {
            // 挂载
            newVNode.el = hostCreateComment((newVNode.children as string) || '')
            hostInsert(newVNode.el, container, anchor)
        } else {
            // 无更新
            newVNode.el = oldVNode.el
        }
    }

    // Fragment 打补丁：都是对子节点的操作
    const processFragment = (oldVNode, newVNode, container, anchor) => {
        if (oldVNode == null) {
            mountChildren(newVNode.children, container, anchor)
        } else {
            // 对比更新
            patchChildren(oldVNode, newVNode, container, anchor)
        }
    }

    // 组件打补丁
    const processComponent = (oldVNode, newVNode, contianer, anchor) => {
        if (oldVNode == null) {
            // 挂载组件
            mountComponent(newVNode, contianer, anchor)
        }
    }

    // 挂载元素
    const mountElement = (vnode, container, anchor) => {
        const { type, props, shapeFlag } = vnode

        // 创建 element
        const el = (vnode.el = hostCreateElement(type))

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 设置为文本节点
            hostSetElementText(el, vnode.children as string)
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 设置为数组节点
            mountChildren(vnode.children, el, anchor)
        }

        // 处理 props
        if (props) {
            for (const key in props) {
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
        if (oldVNode === newVNode) {
            return
        }

        // 判断若不是相同类型的节点，则卸载旧节点
        if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
            unmount(oldVNode)
            oldVNode = null
        }

        const { shapeFlag, type } = newVNode
        switch (type) {
            case Text:
                processText(oldVNode, newVNode, container, anchor)
                break;
            case Comment:
                processCommentNode(oldVNode, newVNode, container, anchor)
                break;
            case Fragment:
                processFragment(oldVNode, newVNode, container, anchor)
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    // 组件
                    processComponent(oldVNode, newVNode, container, anchor)
                }

        }
    }

    const render = (vnode, container) => {
        if (vnode == null) {
            // 卸载
            if (container._vnode) {
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
        if (isString(children)) {
            children = children.split('')
        }
        for (let i = 0; i < children.length; i++) {
            const child = (children[i] = normalizeVNode(children[i]))
            patch(null, child, container, anchor)
        }

    }

    const patchChildren = (oldVNode, newVNode, container, anchor) => {
        // 旧节点
        const c1 = oldVNode && oldVNode.children
        const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
        // 新节点
        const c2 = newVNode.children
        const { shapeFlag } = newVNode

        // 新节点是文本节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧节点是数组节点
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // TODO 卸载旧节点的子节点
            }
            // 若 c1 不等于 c2 guagua
            if (c1 !== c2) {
                // 设置为文本节点
                hostSetElementText(container, c2 as string)
            }
        } else {
            // 旧节点是数组节点
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 新节点是是数组节点
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // TODO 进行 diff 计算
                    patchKeyedChildren(c1, c2, container, anchor)
                } else {
                    // TODO 卸载节点

                }
            } else {
                // 旧节点为 Text_CHILDREN
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    // 删除旧节点的文本
                    hostSetElementText(container, '')
                }
                // 新节点为 ARRAY_CHILDREN
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // TODO 单独挂载新子节点操作
                }
            }
        }
    }

    // 为 props 打补丁
    const patchProps = (el: Element, vnode, oldProps, newProps) => {
        if (oldProps !== newProps) {
            // 1、遍历新的 props 赋值
            for (const key in newProps) {
                const prev = oldProps[key]
                const next = newProps[key]
                if (prev !== next) {
                    hostPatchProp(el, key, prev, next)
                }
            }

            // 遍历旧的 props 若新的里面不存在，则删除
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null)
                }
            }
        }
    }

    const setupRenderEffect = (instance, initialVNode, container, anchor) => {
        // 组件挂载和更新的方法
        const componentUpdateFn = () => {
            // 挂载之前
            if (!instance.isMounted) {

                const { bm, m } = instance
                // 处理 bm
                if (bm) {
                    bm()
                }
                // 获取渲染内容
                const subTree = (instance.subTree = renderComponentRoot(instance))

                // 通过 patch 对 subTree 打补丁
                patch(null, subTree, container, anchor)

                // 处理挂载
                if (m) {
                    m()
                }

                // 根节点赋值
                initialVNode.el = subTree.el

                // 修改 mounted 状态
                instance.isMounted = true
            } else {
                let { next, vnode } = instance
                if (!next) {
                    next = vnode
                }

                // 获取最新的 subTree
                const nextTree = renderComponentRoot(instance)

                // 保存对应的 subTree 以便进行更新
                const prevTree = instance.subTree
                instance.subTree = nextTree

                // 通过 patch 进行更新
                patch(prevTree, nextTree, container, anchor)

                // 更新 next
                next.el = nextTree.el

            }
        }

        // 创建包含 scheduler 的 effect 实例
        // 使用ReactiveEffect 的构造函数 将 componentUpdateFn 作为 fn 传入，() => queuePreFlushCb(update) 作为 scheduler 传入
        const effect = (instance.effect = new ReactiveEffect(
            componentUpdateFn,
            () => queuePreFlushCb(update)
        ))

        // 生成 update 函数
        const update = (instance.update = () => effect.run())
        // 本质触发 componentUpdateFn
        update()
    }

    // TODO 对比节点 进行更新操作
    const patchKeyedChildren = (oldChildren, newChildren, container, parentAnchor) => {
        // 数组索引
        let i = 0;
        let newChildrenLength = newChildren.length
        let oldChildrenEndIndex = oldChildren.length - 1
        let newChildrenEndIndex = newChildrenLength - 1

        // 从前向后遍历 遇到不同类型的跳出
        // 1. sync from start
        // (a b) c
        // (a b) d e
        while (i <= oldChildrenEndIndex && i <= newChildrenEndIndex) {
            const oldVNode = oldChildren[i]
            const newVNode = normalizeVNode(newChildren[i])

            // 如果 oldVNode 和 newVNode 相同类型直接 patch 替换
            if (isSameVNodeType(oldVNode, newVNode)) {
                patch(oldVNode, newVNode, container, null)
            } else {
                break
            }
            i++
        }

        // 从后向前遍历 遇到不同类型的跳出
        // 2. sync from end
        // a (b c)
        // d e (b c)
        while (i <= oldChildrenEndIndex && i <= newChildrenEndIndex) {
            const oldVNode = oldChildren[oldChildrenEndIndex]
            const newVNode = normalizeVNode(newChildren[newChildrenEndIndex])
            if (isSameVNodeType(oldVNode, newVNode)) {
                patch(oldVNode, newVNode, container, null)
            } else {
                break
            }
            oldChildrenEndIndex--
            newChildrenEndIndex--
        }

        // 3. common sequence + mount 新节点多余旧节点
        // (a b)
        // (a b) c 先执行 1.sync from start 在执行 3. common sequence + mount
        // 到3 时 i = 2, e1 = 1, e2 = 2
        // (a b)
        // c (a b) 先执行 2.sync from start 在执行 3. common sequence + mount
        // 到 3 时 i = 0, e1 = -1, e2 = 0
        if(i > oldChildrenEndIndex) {
            if(i <= newChildrenEndIndex) {
                // 判断新节点在头部还是尾部  注意：节点的插入方式 insertBefore，插入到给定元素的前面
                //  头部：从尾部开始对比 nextPos < newChildrenLength，anchor 是 newChildren[nextPos].el ；
                //  尾部：从头部开始对比 nextPos = newChildrenLength，anchor 用父节点 parentAnchor 默认回插入到容器结尾
                const nextPos = newChildrenEndIndex + 1
                const anchor = nextPos < newChildrenLength ? newChildren[nextPos].el : parentAnchor
                while(i <= newChildrenEndIndex) {
                    patch(null, normalizeVNode(newChildren[i]), container, anchor)
                    i++
                }
            }
        } 
        
        // 4. common sequence + unmount 旧节点过于新节点
        // (a b) c
        // (a b)
        // i = 2, e1 = 2, e2 = 1
        // a (b c)
        // (b c)
        // i = 0, e1 = 0, e2 = -1
        else if(i > newChildrenEndIndex) { 
            while(i <= oldChildrenEndIndex) {
                unmount(oldChildren[i]) // 调用的是 nodeOps 的 remove 方法
                i++
            }
        }

        // 5. unknown sequence 乱序处理 借助最长递增子序列减少对比次数
        // [i ... e1 + 1]: a b [c d e] f g
        // [i ... e2 + 1]: a b [e d c h] f g
        // i = 2, e1 = 4, e2 = 5
        else {
            const oldStartIndex = i
            const newStartIndex = i
            const keyToNewIndexMap = new Map()

            // 将新节点的 key 和 index 映射到 map 中
            for(i = newStartIndex; i <= newChildrenEndIndex; i++) {
                const nextChild = normalizeVNode(newChildren[i])
                keyToNewIndexMap.set(nextChild.key, i)
            }
            
            // 循环旧节点 尝试 patch (打补丁) 和 unmount (卸载)
            let j
            // 已打补丁的节点数量
            let patched = 0
            // 待打补丁的节点数量
            const toBePatched = newChildrenEndIndex - newStartIndex + 1
            // 标记：是否移动
            let moved = false
            let maxNewIndexSoFar = 0
            // 最长递增子序列的索引
            let newIndexToOldIndexMap = new Array(toBePatched)
            for(i = 0; i < toBePatched; i++) {
                // 初始化 newIndexToOldIndexMap 为 0 表示新节点未处理
                newIndexToOldIndexMap[i] = 0
            }

            for(i = oldStartIndex; i <= oldChildrenEndIndex; i++) {
                const prevChild = oldChildren[i]
                if(patched >= toBePatched) {
                    // 所有节点处理完成 其余卸载
                    unmount(prevChild)
                    continue
                }

                // 新节点需要的位置
                let newIndex
                if(prevChild.key != null) {
                    // 旧节点 key 存在，根据 key 获取新节点需要的位置
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                }else {
                    // 旧节点 key 不存在
                    for(j = newStartIndex; j <= newChildrenEndIndex; j++) {
                        if(newIndexToOldIndexMap[j - newStartIndex] === 0 && isSameVNodeType(prevChild, newChildren[j])) {
                            // 若找到
                            newIndex = j
                            break
                        }
                    }
                }

                if(newIndex === undefined) {
                    // 若未找到 则卸载
                    unmount(prevChild)
                    continue
                } else {
                    // 若找到 则打补丁
                    newIndexToOldIndexMap[newIndex - newStartIndex] = i + 1
                    if(newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        moved = true
                    }
                    patch(prevChild, newChildren[newIndex], container, null)
                    patched++
                }
            }

            // 获取最长递增子序列
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR

            // 移动和挂载新节点
            j = increasingNewIndexSequence.length - 1
            for(i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + newStartIndex
                const nextChild = newChildren[nextIndex]
                const anchor = nextIndex + 1 < newChildrenLength ? newChildren[nextIndex + 1].el : parentAnchor
            
                if(newIndexToOldIndexMap[i] === 0) {
                    // 挂载新节点
                    patch(null, nextChild, container, anchor)
                } else if(moved) {
                    if(j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动节点
                        move(nextChild, container, anchor)
                    } else {
                        j--
                    }
                }
            }
        }
    }
        // 移动节点到指定位置
    const move = (vnode, container, anchor) => {
        const {el} =vnode
        hostInsert(el, container, anchor)
    }

    return {
        render
    }
}
    

// diff 对比 获取最长递增子序列
function getSequence(arr) {
    /* 浅拷贝解释：p 里若是引用类型，则 p[0] 和 arr[0] 指向同一个对象，若直接修改 p[0].a， arr 就会跟着修改,如下面；
                但如果直接修改 p[0] 则 arr[0].a 不会跟着修改，它意味着直接改变了 p[0] 的指向，而不是修改 p[0].a 的值
                const arr = [{a: 1}, {b: 2}]
                const p = arr.slice()
                p[0].a = 100
                console.log(arr[0].a) // 100    
    */
    /* 补充：深拷贝解释：p 里若是引用类型，则 p 和 arr 指向不同的对象 修改会不影响 */
    // p 是浅拷贝 arr 的值
    const p = arr.slice()
    // 最长递增子序列的下标集合，初始值为 0
    const result = [0]
    let i, j, u, v, c
    // 数组长度
    const len = arr.length

    for(i = 0; i < len; i++) {
        const arrI = arr[i]
        if(arrI !== 0) {
            // 获取 result 最后一个元素，result里的最大值下标
            j = result[result.length - 1]
            if(arr[j] < arrI) { 
                // 存在比当前 result[result.length - 1] 大的值，则直接添加到 result 中
                // 保存当前 arr[i] 的前驱索引 j 到 p[i]
                p[i] = j
                // 保存当前 arr[i] 的值到 result 中
                result.push(i)
                continue // 跳过后续的代码，进入下一次循环
            } 

            /* 若不满足 arr[j] < arr[i] 则说明 result 中的最后位置的值比当前 arr[i] 大，则需要更新 result 中的值 */
            // 二分查找，找到第一个大于 arrI 的值
            u = 0
            v = result.length - 1
            while(u < v) {
                // 获取 result 的中间索引 并向下取整  位运算右移，相当于 (u + v) / 2 向下取整
                c = (u + v) >> 1
                if(arr[result[c]] < arrI) {
                    // 若大于中位数 u 向右遍历
                    u = c + 1
                } else {
                    // 若小于中位数 设置右侧边界 v = 中位数 c 缩小范围
                    v = c 
                }
            }

            if(arr[result[u]] > arrI) {
                if(u > 0) {
                    // 若 result[u] 大于 arrI 则更新 result[u]
                    p[i] = result[u - 1]
                }
                // TODO 待补充 
                result[u] = i
            }

        }
    }
    // 获取最长递增子序列的下标集合
    u = result.length
    v = result[u - 1]
    while(u-- > 0) {
        result[u] = v
        v = p[v]
    }
    return result
}


