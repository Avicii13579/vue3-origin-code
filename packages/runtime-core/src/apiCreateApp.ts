import { createVNode } from "./vnode"

/**
 * 创建 app 实例，返回一个函数
 * @param render 渲染函数
 * @returns 
 */
export function createAppAPI<HostElement>(render) {
    return function createApp(rootComponent, rootProps = null) {
        const app = {
            _component: rootComponent,
            _container: null,
            // 挂载
            mount(rootContainer: HostElement) {
                // 直接通过 createVNode 创建 vnode
                const vnode = createVNode(rootComponent, rootProps)
                // 通过 render 函数渲染
                render(vnode, rootContainer)
            }
        }
        return app
    }
}