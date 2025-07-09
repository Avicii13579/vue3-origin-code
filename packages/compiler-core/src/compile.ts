import { baseParse } from "./parse"

export function  baseCompile(template:string, options) {
    const ast = baseParse(template)
    transform(
        ast,
        expend(options,{
            nodeTransforms:[
                transformElement,
                transformText
            ]
        })
    )
    console.log(JSON.stringify(ast))
    return {}
}