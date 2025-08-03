---
title: Vue3源码总结（三）Runtime运行时详解
createTime: 2025/08/03 09:54:26
description: Vue3源码总结（三）Runtime运行时详解
tags:
  - Vue3
  - technology
categories:
  - 前端开发
permalink: /technology/vue3-origin-part3/
---
<ArticleNavigation 
  :showBreadcrumb="true"
  :showRelatedArticles="false"
/>

## 概述

Vue3 运行时系统是框架的执行引擎，负责将虚拟 DOM 转换为真实 DOM，管理组件生命周期，调度更新任务等核心功能。本文档深入分析 Vue3 运行时系统的架构设计和实现细节。

---

## 一、运行时架构概览

### 1.1 核心模块组成

```
@vue/runtime-core/
├── renderer.ts        # 渲染器核心
├── component.ts       # 组件系统
├── scheduler.ts       # 调度系统
├── vnode.ts          # 虚拟节点
├── h.ts              # 创建虚拟节点
├── apiCreateApp.ts   # 应用实例API
├── apiLifecycle.ts   # 生命周期API
└── componentRenderUtils.ts # 组件渲染工具
```

### 1.2 运行时流程

```
应用创建 → 组件挂载 → 渲染循环 → 更新调度 → 组件卸载
```

---

## 二、渲染器系统

### 2.1 渲染器架构

Vue3 的渲染器采用**跨平台设计**，通过 `RendererOptions` 接口抽象平台相关操作：

```typescript
export interface RendererOptions {
    // DOM 元素操作
    patchProp(el: Element, key: string, prevValue: any, nextValue: any): void
    setElementText(node: Element, text: string): void
    insert(el, parent: Element, anchor?): void
    createElement(type: string)
    createText(text: string)
    setText(node, text): void
    createComment(text: string)
    remove(el): void
}
```

### 2.2 渲染器创建

```typescript
/**
 * 创建渲染器
 * @param options - 平台相关的 DOM 操作方法
 */
export function createRenderer(options: RendererOptions) {
    return baseCreateRenderer(options)
}

function baseCreateRenderer(options: RendererOptions): any {
    // 解构平台操作方法
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

    // 返回渲染器对象
    return {
        render,
        createApp: createAppAPI(render)
    }
}
```

### 2.3 核心 Patch 算法

#### Patch 函数设计

```typescript
/**
 * 核心 patch 函数：对比新旧 VNode 并更新 DOM
 * @param oldVNode - 旧虚拟节点
 * @param newVNode - 新虚拟节点
 * @param container - 容器元素
 * @param anchor - 锚点元素
 */
const patch = (oldVNode, newVNode, container, anchor = null) => {
    // 相同节点直接返回
    if (oldVNode === newVNode) return

    // 类型不同时卸载旧节点
    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
        unmount(oldVNode)
        oldVNode = null
    }

    const { shapeFlag, type } = newVNode
    
    // 根据节点类型选择处理策略
    switch (type) {
        case Text:
            processText(oldVNode, newVNode, container, anchor)
            break
        case Comment:
            processCommentNode(oldVNode, newVNode, container, anchor)
            break
        case Fragment:
            processFragment(oldVNode, newVNode, container, anchor)
            break
        default:
            if (shapeFlag & ShapeFlags.ELEMENT) {
                processElement(oldVNode, newVNode, container, anchor)
            } else if (shapeFlag & ShapeFlags.COMPONENT) {
                processComponent(oldVNode, newVNode, container, anchor)
            }
    }
}
```

#### 节点类型处理策略

**1. 文本节点处理**

```typescript
const processText = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
        // 挂载：创建文本节点并插入
        newVNode.el = hostCreateText(newVNode.children as string)
        hostInsert(newVNode.el, container, anchor)
    } else {
        // 更新：复用元素，更新文本内容
        const el = (newVNode.el = oldVNode.el!)
        if (newVNode.children !== oldVNode.children) {
            hostSetText(el, newVNode.children as string)
        }
    }
}
```

**2. 元素节点处理**

```typescript
const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
        // 挂载操作
        mountElement(newVNode, container, anchor)
    } else {
        // 更新操作
        patchElement(oldVNode, newVNode)
    }
}

const mountElement = (vnode, container, anchor) => {
    const { type, props, shapeFlag } = vnode

    // 1. 创建元素
    const el = (vnode.el = hostCreateElement(type))

    // 2. 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(el, vnode.children as string)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode.children, el, anchor)
    }

    // 3. 处理属性
    if (props) {
        for (const key in props) {
            hostPatchProp(el, key, null, props[key])
        }
    }

    // 4. 插入到容器
    hostInsert(el, container, anchor)
}
```

**3. 组件节点处理**

```typescript
const processComponent = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
        // 挂载组件
        mountComponent(newVNode, container, anchor)
    } else {
        // 更新组件
        updateComponent(oldVNode, newVNode)
    }
}
```

### 2.4 子节点 Diff 算法

Vue3 采用了优化的 diff 算法，包含多种优化策略：

```typescript
const patchChildren = (oldVNode, newVNode, container, anchor) => {
    const c1 = oldVNode && oldVNode.children
    const c2 = newVNode.children
    const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
    const shapeFlag = newVNode.shapeFlag

    // 新子节点是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1)
        }
        if (c2 !== c1) {
            hostSetElementText(container, c2 as string)
        }
    } else {
        // 新子节点是数组
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 核心 diff 算法
                patchKeyedChildren(c1, c2, container, anchor)
            } else {
                unmountChildren(c1)
            }
        } else {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(container, '')
            }
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                mountChildren(c2, container, anchor)
            }
        }
    }
}
```

---

## 三、组件系统

### 3.1 组件实例结构

```typescript
/**
 * 组件实例的核心属性
 */
const instance = {
    uid: uid++,           // 唯一标识
    vnode,               // 组件的虚拟节点
    type,                // 组件类型/定义
    subTree: null!,      // 组件渲染的子树
    effect: null!,       // 响应式副作用
    update: null!,       // 更新函数
    render: null!,       // 渲染函数
    
    // 生命周期状态
    isMounted: false,    // 是否已挂载
    bc: null,           // beforeCreate
    c: null,            // created
    bm: null,           // beforeMount
    m: null,            // mounted
    
    // 组件数据
    data: null,         // 响应式数据
    props: null,        // 属性
    setupState: null,   // setup 返回状态
}
```

### 3.2 组件挂载流程

```typescript
const mountComponent = (initialVNode, container, anchor) => {
    // 1. 创建组件实例
    initialVNode.component = createComponentInstance(initialVNode)
    const instance = initialVNode.component

    // 2. 设置组件（处理 props、slots、setup 等）
    setupComponent(instance)

    // 3. 设置渲染副作用
    setupRenderEffect(instance, initialVNode, container, anchor)
}
```

#### 创建组件实例

```typescript
export function createComponentInstance(vnode) {
    const type = vnode.type
    
    const instance = {
        uid: uid++,
        vnode,
        type,
        subTree: null!,
        effect: null!,
        update: null!,
        render: null!,
        isMounted: false,
        bc: null, c: null, bm: null, m: null
    }
    
    return instance
}
```

#### 设置组件

```typescript
export function setupComponent(instance) {
    const Component = instance.type
    const { setup } = Component
    
    if (setup) {
        // 执行 setup 函数
        const setupResult = setup()
        handleSetupResult(instance, setupResult)
    } else {
        // 完成组件设置
        finishComponentSetup(instance)
    }
}

export function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        // setup 返回渲染函数
        instance.render = setupResult
    }
    finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
    const Component = instance.type

    if (!instance.render) {
        // 编译模板为渲染函数
        if (compile && !Component.render && Component.template) {
            Component.render = compile(Component.template)
        }
        instance.render = Component.render
    }
    
    // 处理选项式 API（data、methods、生命周期等）
    applyOptions(instance)
}
```

### 3.3 渲染副作用设置

```typescript
const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    // 组件更新函数
    const componentUpdateFn = () => {
        if (!instance.isMounted) {
            // === 挂载阶段 ===
            const { bm, m } = instance
            
            // beforeMount 生命周期
            if (bm) bm()
            
            // 执行渲染函数获取子树
            const subTree = (instance.subTree = renderComponentRoot(instance))
            
            // 递归 patch 子树
            patch(null, subTree, container, anchor)
            
            // mounted 生命周期
            if (m) m()
            
            // 保存根元素引用
            initialVNode.el = subTree.el
            instance.isMounted = true
        } else {
            // === 更新阶段 ===
            let { next, vnode } = instance
            if (!next) next = vnode

            // 获取新的子树
            const nextTree = renderComponentRoot(instance)
            const prevTree = instance.subTree
            instance.subTree = nextTree

            // 对比更新
            patch(prevTree, nextTree, container, anchor)
            next.el = nextTree.el
        }
    }

    // 创建响应式副作用
    const effect = (instance.effect = new ReactiveEffect(
        componentUpdateFn,
        () => queuePreFlushCb(update) // 调度器
    ))

    // 创建更新函数
    const update = (instance.update = () => effect.run())
    
    // 首次执行
    update()
}
```

### 3.4 组件渲染

```typescript
export function renderComponentRoot(instance) {
    const { type: Component, vnode, proxy, withProxy, props } = instance
    let result

    try {
        if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            // 有状态组件：调用 render 函数
            const proxyToUse = withProxy || proxy
            result = normalizeVNode(
                instance.render!.call(proxyToUse, proxyToUse!, renderCache)
            )
        } else {
            // 函数式组件
            const render = Component as FunctionalComponent
            result = normalizeVNode(
                render.length > 1
                    ? render(props, proxyToUse)
                    : render(props)
            )
        }
    } catch (err) {
        // 错误处理
        result = createVNode(Comment, null, 'render error')
    }

    return result
}
```

---

## 四、调度系统

### 4.1 异步更新调度

Vue3 的调度系统确保更新的**批量执行**和**异步处理**：

```typescript
// 全局调度状态
let isFlushPending = false
const resolvedPromise = Promise.resolve() as Promise<any>
let currentFlushPromise: Promise<void> | null = null
const pendingPreFlushCbs: Function[] = []
```

### 4.2 队列管理

```typescript
/**
 * 将回调加入预刷新队列
 * @param cb - 回调函数
 */
export function queuePreFlushCb(cb: Function) {
    queueCb(cb, pendingPreFlushCbs)
}

function queueCb(cb: Function, pendingQueue: Function[]) {
    // 加入队列
    pendingQueue.push(cb)
    queueFlush()
}

function queueFlush() {
    if (!isFlushPending) {
        isFlushPending = true
        // 异步执行刷新
        currentFlushPromise = resolvedPromise.then(flushJobs)
    }
}
```

### 4.3 批量执行

```typescript
function flushJobs() {
    isFlushPending = false
    flushPreFlushCbs()
}

export function flushPreFlushCbs() {
    if (pendingPreFlushCbs.length) {
        // 去重并执行
        let activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
        pendingPreFlushCbs.length = 0
        
        for (let i = 0; i < activePreFlushCbs.length; i++) {
            activePreFlushCbs[i]()
        }
    }
}
```

### 4.4 调度策略

1. **微任务调度**：使用 `Promise.resolve().then()` 确保在当前事件循环结束后执行
2. **去重优化**：相同的更新函数只会被执行一次
3. **批量处理**：将多个同步更新合并为一次异步更新
4. **优先级控制**：不同类型的更新有不同的优先级

---

## 五、虚拟 DOM 系统

### 5.1 VNode 结构设计

```typescript
export interface VNode {
    __v_isVNode: true
    type: VNodeTypes          // 节点类型
    props: VNodeProps | null  // 属性
    children: VNodeNormalizedChildren // 子节点
    shapeFlag: number         // 形状标志
    el: HostNode | null       // 对应的真实节点
    key: string | number | symbol | null // 唯一标识
    component: ComponentInternalInstance | null // 组件实例
}
```

### 5.2 ShapeFlags 优化

通过位运算优化类型判断：

```typescript
export const enum ShapeFlags {
    ELEMENT = 1,                    // 0001
    FUNCTIONAL_COMPONENT = 1 << 1,  // 0010
    STATEFUL_COMPONENT = 1 << 2,    // 0100
    TEXT_CHILDREN = 1 << 3,         // 1000
    ARRAY_CHILDREN = 1 << 4,        // 10000
    SLOTS_CHILDREN = 1 << 5,        // 100000
    TELEPORT = 1 << 6,              // 1000000
    SUSPENSE = 1 << 7,              // 10000000
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
    COMPONENT_KEPT_ALIVE = 1 << 9,
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
```

### 5.3 VNode 创建优化

```typescript
export function createVNode(
    type: VNodeTypes,
    props?: (Data & VNodeProps) | null,
    children?: unknown
): VNode {
    // 规范化 props
    if (props) {
        if (props.class) {
            props.class = normalizeClass(props.class)
        }
        if (props.style) {
            props.style = normalizeStyle(props.style)
        }
    }

    // 确定 shapeFlag
    const shapeFlag = isString(type)
        ? ShapeFlags.ELEMENT
        : isObject(type)
            ? ShapeFlags.STATEFUL_COMPONENT
            : isFunction(type)
                ? ShapeFlags.FUNCTIONAL_COMPONENT
                : 0

    return createBaseVNode(type, props, children, shapeFlag)
}
```

---

## 六、生命周期系统

### 6.1 生命周期钩子

```typescript
export const enum LifecycleHooks {
    BEFORE_CREATE = 'bc',
    CREATED = 'c',
    BEFORE_MOUNT = 'bm',
    MOUNTED = 'm',
    BEFORE_UPDATE = 'bu',
    UPDATED = 'u',
    BEFORE_UNMOUNT = 'bum',
    UNMOUNTED = 'um',
    DEACTIVATED = 'da',
    ACTIVATED = 'a',
    RENDER_TRIGGERED = 'rtg',
    RENDER_TRACKED = 'rtc',
    ERROR_CAPTURED = 'ec',
    SERVER_PREFETCH = 'sp'
}
```

### 6.2 生命周期注册

```typescript
export function onBeforeMount(hook: () => void, target?: ComponentInternalInstance) {
    injectHook(LifecycleHooks.BEFORE_MOUNT, hook, target)
}

export function onMounted(hook: () => void, target?: ComponentInternalInstance) {
    injectHook(LifecycleHooks.MOUNTED, hook, target)
}

function injectHook(
    type: LifecycleHooks,
    hook: Function,
    target: ComponentInternalInstance | null = currentInstance
) {
    if (target) {
        const hooks = target[type] || (target[type] = [])
        
        // 包装钩子函数
        const wrappedHook = (...args: unknown[]) => {
            if (target.isUnmounted) return
            
            // 设置当前实例
            setCurrentInstance(target)
            const res = callWithAsyncErrorHandling(hook, target, type, args)
            unsetCurrentInstance()
            return res
        }
        
        hooks.push(wrappedHook)
    }
}
```

### 6.3 生命周期执行

```typescript
function applyOptions(instance: any) {
    const {
        data: dataOptions,
        beforeCreate,
        created,
        beforeMount,
        mounted
    } = instance.type

    // beforeCreate 钩子
    if (beforeCreate) {
        callHook(beforeCreate, instance.data)
    }

    // 处理 data 选项
    if (dataOptions) {
        const data = dataOptions()
        if (isObject(data)) {
            instance.data = reactive(data)
        }
    }

    // created 钩子
    if (created) {
        callHook(created, instance.data)
    }

    // 注册其他生命周期钩子
    function registerLifecycleHook(register: Function, hook?: Function) {
        register(hook?.bind(instance.data), instance)
    }

    registerLifecycleHook(onBeforeMount, beforeMount)
    registerLifecycleHook(onMounted, mounted)
}
```

---

## 七、应用实例系统

### 7.1 应用创建

```typescript
export function createAppAPI<HostElement>(render: RootRenderFunction) {
    return function createApp(rootComponent, rootProps = null): App {
        const app: App = {
            _uid: uid++,
            _component: rootComponent as ConcreteComponent,
            _props: rootProps,
            _container: null,
            _context: context,

            mount(rootContainer: HostElement, isHydrate?: boolean): any {
                if (!isMounted) {
                    // 创建根组件 vnode
                    const vnode = createVNode(rootComponent, rootProps)
                    vnode.appContext = context

                    // 渲染根组件
                    render(vnode, rootContainer, isHydrate)
                    
                    isMounted = true
                    app._container = rootContainer
                    return getExposeProxy(vnode.component!) || vnode.component!.proxy
                }
            },

            unmount() {
                if (isMounted) {
                    render(null, app._container)
                    isMounted = false
                }
            },

            provide(key, value) {
                context.provides[key as string] = value
                return app
            }
        }

        return app
    }
}
```

---

## 八、错误处理系统

### 8.1 错误捕获

```typescript
export function callWithErrorHandling(
    fn: Function,
    instance: ComponentInternalInstance | null,
    type: ErrorTypes,
    args?: unknown[]
) {
    let res
    try {
        res = args ? fn(...args) : fn()
    } catch (err) {
        handleError(err, instance, type)
    }
    return res
}

export function handleError(
    err: unknown,
    instance: ComponentInternalInstance | null,
    type: ErrorTypes,
    throwInDev = true
) {
    const contextVNode = instance ? instance.vnode : null

    if (instance) {
        let cur = instance.parent
        // 向上查找错误边界
        const exposedInstance = instance.exposed
        const errorInfo = ErrorTypeStrings[type]
        
        while (cur) {
            const errorCapturedHooks = cur.ec
            if (errorCapturedHooks) {
                for (let i = 0; i < errorCapturedHooks.length; i++) {
                    if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
                        return
                    }
                }
            }
            cur = cur.parent
        }
    }

    logError(err, type, contextVNode, throwInDev)
}
```

---

## 九、性能优化策略

### 9.1 编译时优化

1. **静态提升（hoisting）**：将静态元素提升到渲染函数外
2. **内联组件 props**：减少对象创建开销
3. **死码消除**：移除未使用的代码

### 9.2 运行时优化

1. **PatchFlags**：标记节点的更新类型，跳过不必要的比较
2. **Block Tree**：将动态节点收集到数组中，减少遍历
3. **缓存事件处理器**：避免重复创建函数

### 9.3 内存优化

1. **对象池**：复用 VNode 对象
2. **弱引用**：使用 WeakMap 避免内存泄露
3. **及时清理**：组件卸载时清理引用

---

## 十、与平台的解耦

### 10.1 渲染器接口设计

```typescript
// 平台无关的核心渲染器
export function createRenderer(options: RendererOptions) {
    return baseCreateRenderer(options)
}

// DOM 平台的渲染器
export function createDOMRenderer() {
    return createRenderer(rendererOptions)
}

// 自定义平台的渲染器
export function createCustomRenderer(options: RendererOptions) {
    return createRenderer(options)
}
```

### 10.2 平台适配层

```typescript
// DOM 平台操作
const rendererOptions = {
    patchProp: patchDOMProp,
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor || null)
    },
    remove: child => {
        const parent = child.parentNode
        if (parent) parent.removeChild(child)
    },
    createElement: (tag) => document.createElement(tag),
    createText: text => document.createTextNode(text),
    createComment: text => document.createComment(text),
    setText: (node, text) => { node.nodeValue = text },
    setElementText: (el, text) => { el.textContent = text }
}
```

---

## 十一、调试和开发工具

### 11.1 开发模式增强

```typescript
if (__DEV__) {
    // 开发模式下的额外检查和警告
    validateComponentName(name)
    validateDirectiveName(name)
    validateProps(props, type)
}
```

### 11.2 HMR 支持

```typescript
export function updateHMRComponent(
    instance: ComponentInternalInstance,
    newRender: Function
) {
    instance.render = newRender
    
    // 触发重新渲染
    instance.update()
}
```

---

## 十二、总结

Vue3 运行时系统的设计特点：

### 12.1 架构优势

1. **跨平台设计**：通过接口抽象实现平台无关
2. **模块化架构**：清晰的职责分离和模块组织
3. **性能优化**：多层次的优化策略
4. **类型安全**：完整的 TypeScript 支持

### 12.2 核心创新

1. **组合式 API**：更好的逻辑复用和组织
2. **Proxy 响应式**：更精确的依赖跟踪
3. **编译时优化**：静态分析和代码生成
4. **调度系统**：批量异步更新

### 12.3 性能特性

1. **精确更新**：只更新实际变化的部分
2. **批量处理**：合并多个更新为一次执行
3. **内存效率**：优化的对象创建和回收
4. **启动性能**：按需加载和懒初始化

Vue3 运行时系统通过精心设计的架构和多层次的优化，为开发者提供了高性能、易用且可扩展的前端框架基础设施。

---

*本文档详细分析了 Vue3 运行时系统的核心实现，从渲染器到组件系统，从调度机制到性能优化，展现了现代前端框架的工程化实践。*