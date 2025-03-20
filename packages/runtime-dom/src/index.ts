import { extend } from "@vue/shared";
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
 
