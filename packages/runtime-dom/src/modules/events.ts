// 为 event 事件打补丁
export function patchEvent(el: Element & {_vei?: object}, rawName: string, prevValue, nextValue) {
    // vei 为 vue event invokers
    const invokers = el._vei || (el._vei = {})
    const existingInvoker = invokers[rawName]

    // 判断当前事件是否存在
    if(existingInvoker && nextValue) {
        // 若存在且有新的事件 直接更新值
        existingInvoker.value = nextValue
    } else {
        // 获取事件名
        const name = parseName(rawName)
        // 若否 先判断是否有限制 
        if(nextValue) {
            // 若有直接添加
            const invoker =  (invokers[rawName] = createInvoker(nextValue))
            el.addEventListener(name, invoker)
        } else if(existingInvoker){
            // 若无直接删除
            el.removeEventListener(name, existingInvoker)
            invokers[rawName] = undefined
        }
    }
}

// 切割事件名
function parseName(name: string) {
    return name.slice(2).toLowerCase()
}

// 穿件事件存储对象
function createInvoker(initialValue) {
    // invoker 是一个函数 参数为 e 只有当 invoker.value 存在时 才会执行 invoker.value()
    const invoker = (e: Event) => {
        invoker.value && invoker.value()
    }
    // value 为事件
    invoker.value = initialValue
    return invoker
}