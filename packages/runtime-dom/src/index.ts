import { extend, isString } from "@vue/shared";
import { nodeOps } from "./nodeOps";
import { patchProp } from "./patchProps";
import { createRenderer } from "packages/runtime-core/src/renderer";

// 合并配置对象
const  rendererOptions = extend({patchProp}, nodeOps)

let renderer

function ensureRenderer() {
    return renderer || (renderer = createRenderer(rendererOptions))
}


export const render = (...args) => {
    // ensureRenderer() 返回的是个 renderer 实例，我们要调用它的 render 方法
    ensureRenderer().render(...args)
}
 
/**
 * 创建并生成 app 实例
 * @param args 
 * @returns 
 */
export  const  createApp = (...args) => {
    const app = ensureRenderer().createApp(...args)

    // 获取挂载方法
    const {mount} = app
    app.mount = (containerOrSelector: Element | string) => {
        const container = normalizeContainer(containerOrSelector)
        if(!container) return
        mount(container)
    }
    return app
}

function normalizeContainer(container: Element | string) {
    if(isString(container)) {
        const res = document.querySelector(container)
        return res
    }
    return container
}
