import { isString } from "@vue/shared"

export function patchStyle(el:Element,prev,next) {
    const style = (el as HTMLElement).style
    const isCssString = isString(next)
    /* vue 支持两种设置语法
     * 1. 对象语法 :style="{ color: activeColor, fontSize: fontSize + 'px' }"
     * 2. 字符串语法 :style="'color: red; font-size: 14px;'"
     */
    if(next && !isCssString) {
        for(let key in next) {
            setStyle(style, key, next[key])
        }

        if(prev && !isString(prev)) {
            for(let key in prev) {
                if(!next[key]) {
                    setStyle(style, key, '')
                }
            }
        }
    }
}

function setStyle( 
    style:CSSStyleDeclaration, 
    name:string, 
    val:string | string[]
){
    style[name] = val
}