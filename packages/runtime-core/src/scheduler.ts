// 对应 promise 的 pending 状态
let isFlushPending = false
// 创建异步任务 安排异步任务在当前同步代码执行完毕后立即执行
const resolvedPromise = Promise.resolve() as Promise<any>
// 当前的执行任务
let currentFlushPromise: Promise<void> | null = null
// 待执行的任务队列
const pendingPreFlushCbs: Function[] =[]

/**
 * 队列预处理函数
 * @param cb 
 */
export function queuePreFlushCb(cb: Function) {
    queueCb(cb,pendingPreFlushCbs)
}

/**
 * 队列处理函数
 * @param cb 
 * @param pendingQueue 
 */
function queueCb(cb:Function, pendingQueue: Function[]) {
    // 将回调函数放入队列
    pendingQueue.push(cb)
    queueFlush()
}

/**
 * 处理当前执行函数，并对 currentFlushPromise 进行复赋值
 */
function queueFlush() {
    if(!isFlushPending) {
        isFlushPending = true
        // 防止阻止主线执行 将其扔到微任务中去执行
        currentFlushPromise = resolvedPromise.then(flushJobs)
    }
}

/**
 * 执行回调函数，并修改执行状态
 */
function flushJobs() {
    isFlushPending = false
    flushPreFlushCbs()
}

/**
 * 依次处理队列中的任务
 */
export function flushPreFlushCbs() {
    if(pendingPreFlushCbs.length) {
        // 若待执行队列长度不为空 去重（防止绑定多依赖的回调函数被重复执行）
        let activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
        pendingPreFlushCbs.length = 0
        for(let i = 0;i<activePreFlushCbs.length; i++) {
            activePreFlushCbs[i]()
        }
    }
}
