import { isArray, isObject } from "@vue/shared"
import { createVNode, isVNode, VNode } from "./vnode"

export function h(type:any, propsOrChildren?: any, children?: any): VNode {
      // 获取传递参数的数量
  const l = arguments.length
  // 参数为二 第二个参数可能是 props 也可能是 children
  if (l === 2) {
    // 第二个参数是对象且不是数组 有两种可能性：1、vnode 2、普通的 props
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // single vnode without props
      // 若为 vnode 默认让其当作子节点
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      // props without children
      return createVNode(type, propsOrChildren)
    } else {
      // omit props
      // 第二个参数为 children
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      // 大于三个后续参数都作为 children 用 call 修改Array 的 this 指向， 获取第三个参数及以后的参数生产新的数组作为 children 的值
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      // 统一 children 的类型 均为数组处理
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}
