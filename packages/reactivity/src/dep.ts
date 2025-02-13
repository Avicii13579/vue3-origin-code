import { ReactiveEffect } from "./effect";

// 构建 Dep 模块，处理一对多的依赖关系 
// Set<ReactiveEffect> 说明 Dep 里存储的是都是 ReactiveEffect 类型的对象
export type Dep = Set<ReactiveEffect>

export  const createDep = (effects?: ReactiveEffect[]): Dep => {
    // 用 effects 初始化 Set
    const dep = new Set<ReactiveEffect>(effects) as  Dep
    return dep
}