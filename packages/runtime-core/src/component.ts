import { reactive } from "@vue/reactivity"
import { isObject } from "@vue/shared"

let uid = 0

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
        render: null! // 组件内部的 render 函数
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
    const {data: dataOptions} = instance.type

    // dataOptions 是组件里的 data 函数
    if(dataOptions) {
        // 获取data
        const data = dataOptions()
        if(isObject(data)) {
            // 如果是个对象 就对其响应式处理 并赋值给 data
            instance.data = reactive(data)
        }
    }
}