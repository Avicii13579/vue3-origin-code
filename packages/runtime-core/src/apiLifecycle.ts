import { LifecycleHooks } from "./component";

// 将 Hook 绑定到指定实例上
export function injectHook(
 type: LifecycleHooks,
 hook: Function,
 target
): Function | undefined {
    if(target) {
        // 注意：此处的 this 指向的是proxy 代理对象
        // 所以 mock 实例中  created() { alert('created', this.msg) }中的 this能拿到 msg 的内容
        target[type] = hook
        return hook
    }
}

// 创建 Hook，将指定 lifecycle 通过 injectHook 绑定到 target 上
// 柯里化工厂函数 内有闭包
export const createHook = (lifecycle: LifecycleHooks) => {
    return (hook, target) => injectHook(lifecycle, hook, target)     
}
/**
 * onBeforeMount = (hook, target) => injectHook(LifecycleHooks.BEFOREMOUNT, hook?.bind(instance.data), instance)
 * instance.data 是代理对象 
 * instance[bm] = hook
 */
export const onBeforeMount = createHook(LifecycleHooks.BEFOREMOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
