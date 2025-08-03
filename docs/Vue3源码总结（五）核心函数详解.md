---
title: Vue3源码总结（五）核心函数详解
createTime: 2025/08/03 09:48:39
description:  Vue3源码总结（五）核心函数详解
tags:
  - Vue3
  - technology
categories:
  - 前端开发
permalink: /technology/vue3-origin-part5/
---

<ArticleNavigation 
  :showBreadcrumb="true"
  :showRelatedArticles="false"
/>

本文档详细解析 Vue3 源码中的核心函数实现，包括响应式系统、编译器、运行时等各个模块的关键函数。

---

## 一、响应式系统核心函数

### 1.1 reactive(target: object)

**作用**：将对象转换为响应式代理对象

```typescript
/**
 * 创建响应式对象
 * @param target - 要代理的目标对象
 * @returns Proxy 代理对象
 */
export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}
```

**实现原理**：
1. 调用 `createReactiveObject` 创建代理
2. 使用 `mutableHandlers` 作为 Proxy 处理器
3. 通过 `reactiveMap` 进行缓存管理

**核心特性**：
- **深度响应式**：嵌套对象自动转换为响应式
- **缓存机制**：同一对象只代理一次
- **类型安全**：完整的 TypeScript 类型支持

---

### 1.2 createReactiveObject()

**作用**：创建响应式对象的核心逻辑

```typescript
/**
 * 创建响应性对象
 * @param target - 被代理对象
 * @param baseHandlers - Proxy 处理器
 * @param proxyMap - 缓存映射
 */
function createReactiveObject(
    target: object,
    baseHandlers: ProxyHandler<any>,
    proxyMap: WeakMap<object, any>
) {
    // 1. 缓存检查：避免重复代理
    const existingProxy = proxyMap.get(target)
    if(existingProxy) {
        return existingProxy
    }

    // 2. 创建 Proxy 代理
    const proxy = new Proxy(target, baseHandlers)
    
    // 3. 添加响应式标记
    proxy[ReactiveFlags.IS_REACTIVE] = true
    
    // 4. 缓存代理对象
    proxyMap.set(target, proxy)
    return proxy
}
```

**关键步骤**：
1. **缓存检查**：避免重复代理同一对象
2. **创建代理**：使用 ES6 Proxy 创建代理对象
3. **添加标记**：标识对象为响应式
4. **缓存存储**：将代理对象存入缓存

---

### 1.3 track(target, key)

**作用**：收集依赖关系

```typescript
/**
 * 收集依赖的方法
 * @param target - 目标对象
 * @param key - 访问的属性键
 */
export function track(target: object, key: unknown) {
    // 没有活跃的 effect 时直接返回
    if(!activeEffect) return
    
    // 获取 target 对应的 depsMap
    let depsMap = targetMap.get(target)
    if(!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    
    // 获取 key 对应的 dep
    let dep = depsMap.get(key)
    if(!dep) {
        depsMap.set(key, (dep = createDep()))
    }
    
    // 收集当前 effect
    trackEffects(dep)
}
```

**数据结构**：
```
targetMap: WeakMap {
  target → Map {
    key → Set<ReactiveEffect>
  }
}
```

**执行时机**：
- 访问响应式对象属性时
- 访问 ref 的 value 时
- 执行计算属性的 getter 时

---

### 1.4 trigger(target, key, newValue)

**作用**：触发依赖更新

```typescript
/**
 * 触发依赖的方法
 * @param target - 目标对象
 * @param key - 修改的属性键
 * @param newValue - 新值
 */
export function trigger(target: object, key?: unknown, newValue?: unknown) {
    // 根据 target 获取存储的 Map 实例
    const depsMap = targetMap.get(target)
    if (!depsMap) return 
    
    // 根据 key 获取 dep 实例
    let dep: Dep | undefined = depsMap.get(key)
    if(!dep) return
    
    // 执行所有相关的 effect
    triggerEffects(dep)
}
```

**优化策略**：
- **批量执行**：一次性处理所有相关依赖
- **优先级处理**：计算属性优先于普通 effect
- **避免死循环**：特殊的执行顺序

---

### 1.5 effect(fn, options)

**作用**：创建副作用函数

```typescript
/**
 * 创建副作用函数
 * @param fn - 副作用函数
 * @param options - 配置选项
 */
export function effect<T = any>(
    fn: () => T,
    options?: ReactiveEffectOptions
) {
    // 创建 ReactiveEffect 实例
    const _effect = new ReactiveEffect(fn)

    // 合并配置选项
    if(options) {
        extend(_effect, options)
    }

    // 非懒加载模式下立即执行
    if (!options || !options.lazy) {
        _effect.run()
    }

    return _effect
}
```

**配置选项**：
```typescript
export interface ReactiveEffectOptions {
    lazy?: boolean          // 是否懒执行
    scheduler?: EffectScheduler  // 自定义调度器
}
```

---

### 1.6 ref(value)

**作用**：为基本类型创建响应式引用

```typescript
/**
 * 创建 ref 引用
 * @param value - 初始值
 */
export function ref(value?: unknown) {
    return createRef(value, false)
}

function createRef(rawValue: unknown, shallow: boolean) {
    if(isRef(rawValue)) {
        return rawValue
    }
    return new RefImpl(rawValue, shallow)
}
```

**RefImpl 类实现**：
```typescript
class RefImpl<T> {
    private _value: T
    private _rawValue: T
    public dep?: Dep | undefined
    public readonly __v_isRef = true

    constructor(value: T, public readonly __v_isShallow: boolean) {
        this._value = __v_isShallow ? value : toReactive(value)
        this._rawValue = value
    }

    get value() {
        trackRefValue(this)  // 收集依赖
        return this._value
    }

    set value(newVal) {
        if(hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal
            this._value = toReactive(newVal)
            triggerRefValue(this)  // 触发依赖
        }
    }
}
```

---

### 1.7 computed(getter)

**作用**：创建计算属性

```typescript
/**
 * 创建计算属性
 * @param getterOrOptions - getter 函数或配置对象
 */
export function computed(getterOrOptions) {
    let getter
    const onlyGetter = isFunction(getterOrOptions)
    if(onlyGetter) {
        getter = getterOrOptions
    }
    
    const cRef = new ComputedRefImpl(getter)
    return cRef as any
}
```

**ComputedRefImpl 类**：
```typescript
export class ComputedRefImpl<T> {
    public dep?: Dep = undefined
    public _dirty = true  // 脏标记
    private _value!: T
    public readonly effect: ReactiveEffect<T>

    constructor(getter) {
        // 创建 effect，使用调度器
        this.effect = new ReactiveEffect(getter, () => {
            if(!this._dirty) {
                this._dirty = true
                triggerRefValue(this)
            }
        })
        this.effect.computed = this
    }

    get value() {
        trackRefValue(this as any)
        
        if(this._dirty) {
            this._dirty = false
            this._value = this.effect.run()!
        }
        return this._value
    }
}
```

**缓存机制**：
- `_dirty` 标记控制是否需要重新计算
- 依赖变化时通过调度器设置脏标记
- 访问时才进行实际计算（惰性求值）

---

## 二、编译器核心函数

### 2.1 baseCompile(template, options)

**作用**：编译模板的主入口函数

```typescript
/**
 * 基础编译函数
 * @param template - 模板字符串
 * @param options - 编译选项
 */
export function baseCompile(template: string, options = {}) {
    // 1. 解析模板为 AST
    const ast = baseParse(template)
    
    // 2. 转换 AST
    transform(ast, extend(options, {
        nodeTransforms: [
            transformElement,
            transformText,
            transformIf
        ]
    }))
    
    // 3. 生成代码
    return generate(ast)
}
```

**编译流程**：
1. **Parse**：模板字符串 → AST
2. **Transform**：AST 优化和转换
3. **Generate**：AST → 渲染函数代码

---

### 2.2 baseParse(content)

**作用**：将模板字符串解析为 AST

```typescript
/**
 * 解析模板为 AST
 * @param content - 模板内容
 */
export function baseParse(content: string) {
    // 创建解析上下文
    const context = createParserContext(content)
    
    // 解析子节点
    const children = parseChildren(context, [])
    
    // 创建根节点
    return createRoot(children)
}
```

**解析器特性**：
- **递归下降解析器**
- **支持多种节点类型**：元素、文本、注释、指令等
- **错误恢复机制**

---

### 2.3 transform(root, options)

**作用**：转换和优化 AST

```typescript
/**
 * 转换 AST
 * @param root - 根节点
 * @param options - 转换选项
 */
export function transform(root, options) {
    // 创建转换上下文
    const context = createTransformContext(root, options)
    
    // 深度优先遍历转换
    traverseNode(root, context)
    
    // 处理根节点
    createRootCodegen(root)
    
    // 收集辅助函数、组件等
    root.helpers = [...context.helpers.keys()]
    root.components = []
    root.directives = []
}
```

**转换过程**：
1. **进入阶段**：收集转换函数
2. **遍历子节点**：递归处理
3. **退出阶段**：执行转换函数

---

### 2.4 traverseNode(node, context)

**作用**：深度优先遍历转换节点

```typescript
/**
 * 遍历转换节点
 * @param node - 当前节点
 * @param context - 转换上下文
 */
export function traverseNode(node, context) {
    context.currentNode = node
    const { nodeTransforms } = context
    const exitFns = []
    
    // 进入阶段：执行转换函数
    for(let i = 0; i < nodeTransforms.length; i++) {
        const onExit = nodeTransforms[i](node, context)
        if(onExit) {
            exitFns.push(onExit)
        }
    }
    
    // 递归处理子节点
    switch(node.type) {
        case NodeTypes.ELEMENT:
        case NodeTypes.ROOT:
            traverseChildren(node, context)
            break
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break
    }
    
    // 退出阶段：执行退出函数
    context.currentNode = node
    let i = exitFns.length
    while(i--) {
        exitFns[i]()
    }
}
```

**设计特点**：
- **两阶段处理**：进入和退出阶段
- **深度优先**：确保子节点先于父节点处理
- **插件化**：转换函数可插拔

---

### 2.5 generate(ast)

**作用**：生成渲染函数代码

```typescript
/**
 * 生成代码
 * @param ast - AST 根节点
 */
export function generate(ast) {
    const context = createCodegenContext(ast)
    const { push, indent, deindent, newline } = context

    // 生成函数前置代码
    genFunctionPreamble(context)

    // 生成函数签名
    const functionName = 'render'
    const args = ['_ctx', '_cache']
    const signature = args.join(', ')

    // 生成函数体
    push(`function ${functionName}(${signature}) {`)
    indent()

    // 生成 with 语句
    push('with(_ctx) {')
    indent()

    // 生成辅助函数导入
    if(ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = _Vue`)
        newline()
    }

    // 生成 return 语句
    push(`return `)
    if(ast.codegenNode) {
        genNode(ast.codegenNode, context)
    } else {
        push(`null`)
    }

    deindent()
    push('}')
    deindent()
    push('}')

    return {
        ast,
        code: context.code,
    }
}
```

---

## 三、运行时核心函数

### 3.1 h(type, props, children)

**作用**：创建虚拟 DOM 节点

```typescript
/**
 * 创建 VNode
 * @param type - 节点类型
 * @param propsOrChildren - 属性或子节点
 * @param children - 子节点
 */
export function h(type: any, propsOrChildren?: any, children?: any): VNode {
    const l = arguments.length
    
    if (l === 2) {
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            if (isVNode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren])
            }
            return createVNode(type, propsOrChildren)
        } else {
            return createVNode(type, null, propsOrChildren)
        }
    } else {
        if (l > 3) {
            children = Array.prototype.slice.call(arguments, 2)
        } else if (l === 3 && isVNode(children)) {
            children = [children]
        }
        return createVNode(type, propsOrChildren, children)
    }
}
```

**参数处理**：
- **灵活的参数形式**：支持多种调用方式
- **自动类型推断**：根据参数类型确定含义
- **统一的内部表示**：最终都调用 `createVNode`

---

### 3.2 createVNode(type, props, children)

**作用**：创建虚拟节点的核心函数

```typescript
/**
 * 创建虚拟节点
 * @param type - 节点类型
 * @param props - 属性
 * @param children - 子节点
 */
export function createVNode(type: any, props?: any, children?: any): VNode {
    // 规范化 props
    if (props) {
        // 处理 class 和 style
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
            : 0

    // 创建 vnode
    const vnode: VNode = {
        type,
        props,
        children,
        shapeFlag,
        el: null,
        key: props && props.key,
        // ... 其他属性
    }

    // 规范化子节点
    normalizeChildren(vnode, children)

    return vnode
}
```

---

### 3.3 render(vnode, container)

**作用**：渲染虚拟节点到容器

```typescript
/**
 * 渲染函数
 * @param vnode - 虚拟节点
 * @param container - 容器元素
 */
const render = (vnode, container) => {
    if (vnode == null) {
        // 卸载
        if (container._vnode) {
            unmount(container._vnode)
        }
    } else {
        // 打补丁（挂载或更新）
        patch(container._vnode || null, vnode, container)
    }
    container._vnode = vnode
}
```

---

### 3.4 patch(n1, n2, container, anchor)

**作用**：对比新旧节点并更新 DOM

```typescript
/**
 * 打补丁函数
 * @param oldVNode - 旧虚拟节点
 * @param newVNode - 新虚拟节点
 * @param container - 容器
 * @param anchor - 锚点
 */
const patch = (oldVNode, newVNode, container, anchor = null) => {
    if (oldVNode === newVNode) return

    // 类型不同时卸载旧节点
    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
        unmount(oldVNode)
        oldVNode = null
    }

    const { shapeFlag, type } = newVNode
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

**Patch 策略**：
- **类型判断**：根据节点类型选择处理方式
- **差异更新**：只更新变化的部分
- **优化算法**：多种优化策略提升性能

---

## 四、工具函数

### 4.1 hasChanged(value, oldValue)

**作用**：检查值是否发生变化

```typescript
/**
 * 检查值是否变化
 */
export const hasChanged = (value: any, oldValue: any): boolean =>
    !Object.is(value, oldValue)
```

### 4.2 isObject(val)

**作用**：判断是否为对象

```typescript
/**
 * 判断是否为对象
 */
export const isObject = (val: unknown): val is Record<any, any> =>
    val !== null && typeof val === 'object'
```

### 4.3 extend(a, b)

**作用**：对象属性合并

```typescript
/**
 * 对象合并
 */
export const extend = Object.assign
```

---

## 五、函数调用关系图

```
用户代码
    ↓
reactive(obj) → createReactiveObject() → new Proxy()
    ↓
obj.property (get) → track() → trackEffects()
    ↓
obj.property = value (set) → trigger() → triggerEffects()
    ↓
effect.run() → fn() → 重新收集依赖
```

---

## 六、总结

Vue3 核心函数的设计特点：

### 6.1 设计原则

1. **单一职责**：每个函数职责明确
2. **高内聚低耦合**：模块间依赖关系清晰
3. **可扩展性**：支持插件和自定义扩展
4. **性能优化**：多层次优化策略

### 6.2 架构优势

1. **类型安全**：完整的 TypeScript 支持
2. **函数式编程**：纯函数和不可变性
3. **组合式 API**：更好的逻辑复用
4. **树摇优化**：按需引入，减少包体积

### 6.3 性能特性

1. **精确依赖追踪**：避免不必要的更新
2. **编译时优化**：静态分析和代码生成
3. **运行时优化**：缓存、批量更新等
4. **内存管理**：WeakMap 避免内存泄露

这些核心函数构成了 Vue3 强大而高效的基础设施，为开发者提供了优秀的开发体验和应用性能。

---

*本文档详细分析了 Vue3 的核心函数实现，从 API 设计到内部算法，展现了现代前端框架的工程化实践。*