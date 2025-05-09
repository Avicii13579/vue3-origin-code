import { reactive } from "@vue/reactivity"
import { isObject } from "@vue/shared"
import { onBeforeMount, onMounted } from "./apiLifecycle"

let uid = 0

export const enum LifecycleHooks {
    BEFORECREATE = 'bc',
    CREATED = 'c',
    BEFOREMOUNT = 'bm',
    MOUNTED = 'm'
}

// 创建组件实例
export function createComponentInstance(vnode) {
    const type = vnode.type

    const instance = {
        uid: uid++, // 唯一标记
        vnode, // 虚拟节点
        type, // 组件类型
        subTree: null!, // render 函数的返回值（非空断言，初始为 null，使用时不为 null）
        effect: null!, // ReactiveEffect 实例
        update: null!, // 函数 会触发 effect.run
        render: null!, // 组件内部的 render 函数

        // 增加生命周期函数
        isMounted: false, // 是否挂载
        bc: null, // beforeCreate
        c: null, // created
        bm: null, // beforeMount
        m: null // mounted

    }
    return instance
}

// 初始化组件属性
export function setupComponent(instance) {
    // 将 render 赋值到 instance.render 上
    const setupResult =  setupStatefullComponent(instance)
    return setupResult
}

function setupStatefullComponent(instance) {
    finishComponentSetup(instance)
}

// 为 instance 绑定 render 属性
function finishComponentSetup(instance) {
    const Component = instance.type

    instance.render = Component.render
    // 处理 instance 上的 data 属性
    applyOptions(instance)
}

function applyOptions(instance:any) {
    const {data: dataOptions,
        beforeCreate,
        created,
        beforeMount,
        mounted
    } = instance.type

    // dataOptions 是组件里的 data 函数
    if(dataOptions) {
        // 获取data
        const data = dataOptions()
        if(isObject(data)) {
            // 如果是个对象 就对其响应式处理 并赋值给 data
            instance.data = reactive(data)
        }
    }

    // 生命周期钩子
    if (beforeCreate) {
        callHook(beforeCreate, instance.data)
    }

    if(created) {
        callHook(created, instance.data)
    }

    function registerLifecycleHook(register: Function, hook?: Function) {
        // 柯里化工厂函数 目的是实现将生命周期挂载到 instance 实例上 
        // 目的：instace[bm] = hook
        register(hook?.bind(instance.data), instance)
    }

    registerLifecycleHook(onBeforeMount, beforeMount)
    registerLifecycleHook(onMounted, mounted)
}

function callHook(hook: Function, proxy) {
    // 指定 this 并调用生命周期
    hook.bind(proxy)()
}