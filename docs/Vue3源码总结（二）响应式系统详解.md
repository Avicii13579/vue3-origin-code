---
title: Vue3源码总结（二）响应式系统详解
createTime: 2025/08/03 09:46:57
description: Vue3源码总结（二）响应式系统详解
tags:
  - Vue3
  - technology
categories:
  - 前端开发
permalink: /technology/vue3-origin-part2/
---
<ArticleNavigation 
  :showBreadcrumb="true"
  :showRelatedArticles="false"
/>

## 概述

Vue3 响应式系统是整个框架的核心，采用基于 **ES6 Proxy** 的全新实现，相比 Vue2 的 `Object.defineProperty` 有了质的提升。本文档深入分析响应式系统的实现原理、核心算法和设计思想。

---

## 一、整体架构设计

### 1.1 核心理念

```
数据变化 → 自动更新视图
```

Vue3 响应式系统遵循以下核心原则：
- **数据劫持**：通过 Proxy 劫持数据访问
- **依赖收集**：在数据读取时收集依赖关系
- **依赖触发**：在数据修改时自动触发相关更新

### 1.2 模块组成

```
@vue/reactivity/
├── reactive.ts     # 响应式对象创建
├── ref.ts         # 基本类型响应式
├── computed.ts    # 计算属性实现
├── effect.ts      # 副作用系统
├── dep.ts         # 依赖管理
└── baseHandlers.ts # Proxy 处理器
```

---

## 二、数据结构设计

### 2.1 依赖收集的三层映射

```typescript
// 全局依赖映射表
const targetMap = new WeakMap<any, KeyToDepMap>()

// 类型定义
type KeyToDepMap = Map<any, Dep>
type Dep = Set<ReactiveEffect>
```

#### 数据结构说明：

```
WeakMap {
  target1: Map {
    'property1': Set { effect1, effect2 },
    'property2': Set { effect3 }
  },
  target2: Map {
    'property1': Set { effect4 }
  }
}
```

- **第一层 WeakMap**：以目标对象为 key，存储该对象的属性依赖映射
- **第二层 Map**：以属性名为 key，存储该属性的所有依赖 effect
- **第三层 Set**：存储具体的 ReactiveEffect 实例

#### 为什么使用 WeakMap？

1. **自动垃圾回收**：当目标对象被销毁时，WeakMap 中的条目也会被自动清除
2. **避免内存泄露**：不会阻止目标对象的垃圾回收
3. **键的隐私性**：WeakMap 的键不可枚举

---

## 三、reactive() 深度解析

### 3.1 核心实现流程

```typescript
export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}

function createReactiveObject(
    target: object,
    baseHandlers: ProxyHandler<any>,
    proxyMap: WeakMap<object, any>
) {
    // 1. 缓存检查
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

### 3.2 缓存机制

```typescript
// 全局缓存 Map
export const reactiveMap = new WeakMap<object, any>()
```

**缓存的作用**：
- 确保同一对象只会被代理一次
- 避免重复创建 Proxy 对象
- 保持引用一致性

### 3.3 Proxy Handlers 详解

```typescript
export const mutableHandlers: ProxyHandler<object> = {
    get: createGetter(),
    set: createSetter()
}

function createGetter() {
    return function get(target: object, key: string | symbol, receiver: object) {
        // 获取原始值
        const res = Reflect.get(target, key, receiver)
        
        // 依赖收集
        track(target, key)
        
        // 深度响应式：如果值是对象，递归代理
        if (isObject(res)) {
            return reactive(res)
        }
        
        return res
    }
}

function createSetter() {
    return function set(target: object, key: string | symbol, value: unknown, receiver: object) {
        // 设置新值
        const result = Reflect.set(target, key, value, receiver)
        
        // 触发依赖
        trigger(target, key, value)
        
        return result
    }
}
```

#### 为什么使用 Reflect？

1. **标准化操作**：Reflect 提供了标准的对象操作方法
2. **避免递归调用**：`Reflect.set` 不会触发 Proxy 的 set 陷阱
3. **正确的 this 绑定**：通过 receiver 参数确保正确的 this 上下文

---

## 四、依赖收集机制

### 4.1 track() 函数详解

```typescript
export function track(target: object, key: unknown) {
    // 没有激活的 effect 时直接返回
    if (!activeEffect) return
    
    // 获取或创建 target 对应的 depsMap
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    
    // 获取或创建 key 对应的 dep
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = createDep()))
    }
    
    // 将当前 effect 添加到依赖集合
    trackEffects(dep)
}

export function trackEffects(dep: Dep) {
    // 将当前激活的 effect 添加到依赖集合
    dep.add(activeEffect!)
}
```

### 4.2 依赖收集时机

依赖收集发生在以下场景：
1. **访问响应式对象属性**：`obj.property`
2. **访问 ref 的 value**：`refObj.value`
3. **执行计算属性的 getter**：`computed(() => ...)`

### 4.3 activeEffect 机制

```typescript
// 全局变量，跟踪当前执行的 effect
export let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect<T = any> {
    constructor(
        public fn: () => T,
        public scheduler: EffectScheduler | null = null
    ) {}

    run() {
        // 设置全局 activeEffect
        activeEffect = this
        try {
            // 执行副作用函数，期间的所有属性访问都会被收集
            return this.fn()
        } finally {
            // 执行完毕后清理
            activeEffect = undefined
        }
    }
}
```

---

## 五、依赖触发机制

### 5.1 trigger() 函数详解

```typescript
export function trigger(target: object, key?: unknown, newValue?: unknown) {
    // 根据 target 获取 depsMap
    const depsMap = targetMap.get(target)
    if (!depsMap) return
    
    // 根据 key 获取 dep
    let dep: Dep | undefined = depsMap.get(key)
    if (!dep) return
    
    // 触发所有相关的 effect
    triggerEffects(dep)
}
```

### 5.2 批量触发优化

```typescript
export function triggerEffects(dep: Dep) {
    const effects = isArray(dep) ? dep : [...dep]
    
    // 关键优化：先执行计算属性，再执行普通 effect
    // 避免无限循环和重复计算
    for (const effect of effects) {
        if (effect.computed) {
            triggerEffect(effect)
        }
    }
    for (const effect of effects) {
        if (!effect.computed) {
            triggerEffect(effect)
        }
    }
}

export function triggerEffect(effect: ReactiveEffect) {
    if (effect.scheduler) {
        // 如果有调度器，使用调度器执行
        effect.scheduler()
    } else {
        // 否则直接执行
        effect.run()
    }
}
```

### 5.3 调度系统

调度系统允许自定义 effect 的执行时机：

```typescript
effect(() => {
    // 副作用逻辑
}, {
    scheduler: () => {
        // 自定义调度逻辑，比如异步执行
        nextTick(() => effect.run())
    }
})
```

---

## 六、ref 系统实现

### 6.1 RefImpl 类详解

```typescript
class RefImpl<T> {
    private _value: T           // 当前值
    private _rawValue: T        // 原始值
    public dep?: Dep            // 依赖集合
    public readonly __v_isRef = true  // ref 标识

    constructor(value: T, public readonly __v_isShallow: boolean) {
        this._value = __v_isShallow ? value : toReactive(value)
        this._rawValue = value
    }

    get value() {
        // 收集依赖
        trackRefValue(this)
        return this._value
    }

    set value(newVal) {
        // 值变化检测
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal
            this._value = toReactive(newVal)
            // 触发依赖
            triggerRefValue(this)
        }
    }
}
```

### 6.2 ref 与 reactive 的协作

```typescript
// 自动转换复杂对象为 reactive
export const toReactive = <T extends unknown>(value: T): T => 
    isObject(value) ? reactive(value as object) : value

// ref 依赖收集
export function trackRefValue(ref: RefImpl<any>) {
    if (activeEffect) {
        trackEffects(ref.dep || (ref.dep = createDep()))
    }
}

// ref 依赖触发
export function triggerRefValue(ref) {
    if (ref.dep) {
        triggerEffects(ref.dep)
    }
}
```

---

## 七、computed 计算属性

### 7.1 ComputedRefImpl 实现

```typescript
export class ComputedRefImpl<T> {
    public dep?: Dep = undefined
    public _dirty = true         // 脏标记
    private _value!: T           // 缓存值
    public readonly effect: ReactiveEffect<T>
    public readonly __v_isRef = true

    constructor(getter) {
        // 创建 effect，使用调度器控制重新计算
        this.effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true
                triggerRefValue(this)
            }
        })
        this.effect.computed = this
    }

    get value() {
        // 收集计算属性的依赖
        trackRefValue(this as any)
        
        if (this._dirty) {
            // 只有在脏标记为 true 时才重新计算
            this._dirty = false
            this._value = this.effect.run()!
        }
        return this._value
    }
}
```

### 7.2 缓存机制

计算属性的缓存机制包括：

1. **脏标记 (_dirty)**：
   - `true`：需要重新计算
   - `false`：使用缓存值

2. **调度器模式**：
   - 依赖变化时不立即计算
   - 而是设置脏标记，延迟到下次访问时计算

3. **依赖链**：
   - 计算属性本身也是响应式的
   - 可以被其他 effect 依赖

---

## 八、effect 系统

### 8.1 effect() 函数

```typescript
export function effect<T = any>(
    fn: () => T,
    options?: ReactiveEffectOptions
) {
    // 创建 effect 实例
    const _effect = new ReactiveEffect(fn)

    // 合并选项
    if (options) {
        extend(_effect, options)
    }

    // 非懒执行模式下立即运行
    if (!options || !options.lazy) {
        _effect.run()
    }

    return _effect
}
```

### 8.2 ReactiveEffect 类

```typescript
export class ReactiveEffect<T = any> {
    computed?: ComputedRefImpl<T>  // 关联的计算属性

    constructor(
        public fn: () => T,
        public scheduler: EffectScheduler | null = null
    ) {}

    run() {
        // 设置当前激活的 effect
        activeEffect = this
        try {
            // 执行副作用函数
            return this.fn()
        } finally {
            // 清理全局状态
            activeEffect = undefined
        }
    }

    stop() {
        // 停止 effect，清理所有依赖关系
        // 实现 effect 的手动销毁
    }
}
```

---

## 九、性能优化策略

### 9.1 WeakMap 的使用

```typescript
// 使用 WeakMap 存储依赖映射
const targetMap = new WeakMap<any, KeyToDepMap>()

// 使用 WeakMap 缓存代理对象
export const reactiveMap = new WeakMap<object, any>()
```

**优势**：
- 自动垃圾回收
- 避免内存泄露
- 更好的性能表现

### 9.2 单例模式

```typescript
// 确保同一对象只被代理一次
const existingProxy = proxyMap.get(target)
if (existingProxy) {
    return existingProxy
}
```

### 9.3 延迟计算

```typescript
// computed 的惰性求值
if (this._dirty) {
    this._dirty = false
    this._value = this.effect.run()!
}
```

### 9.4 批量更新

```typescript
// 先执行计算属性，避免重复计算
for (const effect of effects) {
    if (effect.computed) {
        triggerEffect(effect)
    }
}
```

---

## 十、设计模式应用

### 10.1 观察者模式

- **Subject**：响应式数据
- **Observer**：effect 函数
- **通知机制**：依赖收集与触发

### 10.2 代理模式

- **目标对象**：原始数据
- **代理对象**：Proxy 实例
- **拦截操作**：get/set 处理器

### 10.3 单例模式

- **缓存机制**：确保对象只被代理一次
- **全局状态**：activeEffect 的管理

### 10.4 策略模式

- **不同类型数据**：reactive、ref、computed
- **不同处理策略**：各自的实现逻辑

---

## 十一、与 Vue2 对比

| 特性 | Vue2 | Vue3 |
|------|------|------|
| **实现方式** | Object.defineProperty | Proxy |
| **数组支持** | 需要特殊处理 | 原生支持 |
| **对象新增属性** | Vue.set() | 自动支持 |
| **性能** | 初始化时递归 | 惰性代理 |
| **嵌套对象** | 深度遍历 | 按需代理 |
| **兼容性** | IE8+ | IE11+ |

### Vue3 的优势：

1. **更好的性能**：Proxy 的性能优于 defineProperty
2. **更完整的拦截**：支持更多操作类型
3. **更简洁的 API**：不需要 Vue.set 等特殊方法
4. **更好的 TypeScript 支持**：类型推断更准确

---

## 十二、总结

Vue3 响应式系统的核心特点：

1. **基于 Proxy**：提供完整的拦截能力
2. **精确依赖追踪**：三层映射结构实现精确的依赖管理
3. **性能优化**：多层次的缓存和优化策略
4. **类型安全**：完整的 TypeScript 支持
5. **设计优雅**：清晰的模块划分和职责分离

这套响应式系统不仅性能优异，而且架构清晰，为 Vue3 的高性能和易用性奠定了坚实基础。

---

*本文档深入分析了 Vue3 响应式系统的实现原理，从数据结构设计到具体算法实现，展现了现代前端框架的设计精髓。*