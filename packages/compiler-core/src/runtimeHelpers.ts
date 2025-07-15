export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')
export const CREATE_VNODE = Symbol('createVNode')
export const TO_DISPLAY_STRING = Symbol('toDisplayString')

/**
 * const {xx} = Vue
 * 即：从 Vue 中可以被导出的方法，我们这里统一用 creaVNode
 */
export const helperNameMap = {
    // 在 renderer 中通过 export { creatVNode as createElementVNode } 导出
    [CREATE_ELEMENT_VNODE]: 'createElementVNode',
    [CREATE_VNODE]: 'createVNode',
    [TO_DISPLAY_STRING]: 'toDisplayString'
}