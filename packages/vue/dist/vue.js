var Vue = (function (exports) {
    'use strict';

    // 将值转换为字符串
    function toDisplayString(value) {
        return String(value);
    }

    var isArray = Array.isArray;
    // 判断是否为一个对象
    var isObject = function (value) { return value !== null && typeof value === 'object'; };
    // 判断两个值是否相等 发生改变后返回 true 可同时判断基本类型和引用类型
    var hasChanged = function (value, oldValue) { return !Object.is(value, oldValue); };
    // 是否为一个 function 
    var isFunction = function (val) { return typeof val === 'function'; };
    var isString = function (val) { return typeof val === 'string'; };
    // 合并对象
    var extend = Object.assign;
    // 判断是否为 on 开头
    var onRE = /^on[^a-z]/;
    var isOn = function (key) { return onRE.test(key); };
    // 判断是否为同类型节点
    var isSameVNodeType = function (n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    };
    // 只读空对象
    var EMPTY_OBJ = {};
    // 空数组
    var EMPTY_ARR = [];

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    var createDep = function (effects) {
        // 用 effects 初始化 Set
        var dep = new Set(effects);
        return dep;
    };

    /**
     * WeakMap 的 key 类型为 any，value 的类型为 KeyToDepMap
     */
    var targetMap = new WeakMap();
    /**
     * 收集依赖的方法
     * @param target WeakMap 的 key
     * @param key 代理对象的 key，当依赖被触发时，需要根据 key 判断依赖是否存在
     */
    function track(target, key) {
        // 如果当前执行函数不存在，则直接 return
        if (!activeEffect)
            return;
        // 尝试从 targetMap 中获取 target 对应的 value：Map
        var depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        var dep = depsMap.get(key);
        // 如果 key 对应的值 Set 不存在，则生成新的 Set 对象，并将该对象复制给 Value
        if (!dep) {
            depsMap.set(key, (dep = createDep()));
        }
        trackEffects(dep);
    }
    /**
     * 利用 dep 依次跟踪指定 key 的所有 effect
     * @param dep
     */
    function trackEffects(dep) {
        // 此处断言 activeEffect 不为 null 或 undefined
        // activeEffect 如何被多次传入? 注意：每一次调用 effect 都会用 new ReactiveEffect 去创建实例，而 activeEffect 会通过 实例.run函数 指向这个 effect 实例
        dep.add(activeEffect);
    }
    /**
     * 触发依赖的方法
     * @param target WeakMap 的 key
     * @param key 代理对象的 key，当依赖被触发时，需要根据 key 获取
     * @param newValue key 对应的新值
     */
    function trigger(target, key, newValue) {
        // 根据 target 获取存储的 Map 实例
        var depsMap = targetMap.get(target);
        if (!depsMap)
            return;
        // 依据指定的 Key 获取 dep 实例
        var dep = depsMap.get(key);
        if (!dep)
            return;
        // 执行 effect 中的 fn 函数（执行了和属性有依赖的副作用函数） fn 就是暴露出的 effect 函数里传递的匿名回调函数
        // effect.fn()
        triggerEffects(dep);
    }
    /**
     * 依次触发 dep 中保存的依赖
     * @param dep
     */
    function triggerEffects(dep) {
        var e_1, _a, e_2, _b;
        // 把 dep 构建成一个数组
        var effects = isArray(dep) ? dep : __spreadArray([], __read(dep), false);
        try {
            // 依次触发
            // for(const effect of effects) {
            //  // BUG 测试计算属性具备缓存性：当第二个 effect 是计算属性时，会进入调度函数，再从 triggerRefValue 中进入，导致死循环
            //  triggerEffect(effect)
            // }
            // 解决死循环：必须先触发计算属性的 effect 在触发非计算属性的 effect
            for (var effects_1 = __values(effects), effects_1_1 = effects_1.next(); !effects_1_1.done; effects_1_1 = effects_1.next()) {
                var effect_1 = effects_1_1.value;
                if (effect_1.computed) {
                    triggerEffect(effect_1);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (effects_1_1 && !effects_1_1.done && (_a = effects_1.return)) _a.call(effects_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            for (var effects_2 = __values(effects), effects_2_1 = effects_2.next(); !effects_2_1.done; effects_2_1 = effects_2.next()) {
                var effect_2 = effects_2_1.value;
                if (!effect_2.computed) {
                    triggerEffect(effect_2);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (effects_2_1 && !effects_2_1.done && (_b = effects_2.return)) _b.call(effects_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    function triggerEffect(effect) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
    /**
     * effect 函数
     * @param fn
     * @returns 以 ReactiveEffect 实例为 this 的执行函数
     */
    function effect(fn, options) {
        // 实现 ReactiveEffect 实例
        var _effect = new ReactiveEffect(fn);
        // 存在 options 会进行配置对象合并
        if (options) {
            extend(_effect, options);
        }
        if (!options || !options.lazy) {
            // 执行 run 函数（默认 effect 调用里的 fn 会执行一次）
            _effect.run();
        }
    }
    /**
     * 是一个全局变量，用于追踪当前正在执行的副作用函数 作用：1、在依赖收集时，知道当前是哪个 effect 正在访问响应式数据 2、建立响应式数据和副作用函数之间的联系
     * 单例的 当前的 effect 拥有 run 函数能执行 fn 的 ReactiveEffect 的实例
     */
    var activeEffect;
    /**
     * 响应性触发依赖时的执行类
     */
    var ReactiveEffect = /** @class */ (function () {
        // 接收传入的回调函数 fn
        function ReactiveEffect(fn, scheduler) {
            if (scheduler === void 0) { scheduler = null; }
            this.fn = fn;
            this.scheduler = scheduler;
        }
        ReactiveEffect.prototype.run = function () {
            // 为 activeEffect 复制
            activeEffect = this;
            // 执行 fn 函数
            return this.fn();
        };
        ReactiveEffect.prototype.stop = function () { };
        return ReactiveEffect;
    }());

    var get = createGetter();
    var set = createSetter();
    /**
     * 响应性的 handler 监听 setter getter
     */
    var mutableHandlers = {
        get: get,
        set: set
    };
    /**
     * getter 回调方法
     * 注意：Reflect 具备同步修改 Proxy 的能力，并且 Reflect.set 方法不会触发 Proxy.set 函数，造成递归
     * @returns
     */
    function createGetter() {
        return function get(target, key, receiver) {
            // 利用 reflect 得到返回值
            var res = Reflect.get(target, key, receiver);
            // 收集依赖
            track(target, key);
            return res;
        };
    }
    /**
     * setter 回调
     * 注意 使用 unknown 和 any 的区别，可以确保我们在对 value 进行操作之前进行类型检查
     * @returns
     */
    function createSetter() {
        return function set(target, key, value, receiver) {
            // 利用 Reflect.set 设置新值
            var result = Reflect.set(target, key, value, receiver);
            // 触发依赖
            trigger(target, key);
            return result;
        };
    }

    /**
     * 响应性 Map 缓存对象
     * key: target
     * value: proxy
     * 注意：为了获取指定对象的指定属性对应的执行函数 fn，我们可以借助 WeakMap 实现
     * WeakMap：
     * key: 响应性对象 target
     * value: Map 对象
     *      key：响应性对象的指定属性
     *      value：指定对象指定属性的执行函数 fn
     */
    var reactiveMap = new WeakMap();
    /**
     * 为复杂对象 创建响应性对象
     * @param target 被代理对象
     * @returns 代理对象
     */
    function reactive(target) {
        return createReactiveObject(target, mutableHandlers, reactiveMap);
    }
    /**
     * 创建响应性对象
     * @param target 被代理对象
     * @param baseHandlers handler
     * @param proxyMap
     */
    function createReactiveObject(target, baseHandlers, proxyMap) {
        // 如果该实例已经被代理，直接读取
        var existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // 未代理则生成 proxy 实例
        var proxy = new Proxy(target, baseHandlers);
        // 为 Reactive 增加标记
        proxy["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */] = true;
        // 缓存代理对象
        proxyMap.set(target, proxy);
        return proxy;
    }
    // 对复杂对象进行响应性处理
    var toReactive = function (value) { return isObject(value) ? reactive(value) : value; };
    function isReactive(value) {
        return !!(value && value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */]);
    }

    /**
     * ref 入口
     * @param value
     * @returns
     */
    function ref(value) {
        return createRef(value, false);
    }
    /**
     * 创建一个 RefImpl 对象
     * @param rawValue
     * @param shallow
     * @returns
     */
    function createRef(rawValue, shallow) {
        // 如果 rawValue 是 ref 类型数据，则直接返回
        if (isRef(rawValue)) {
            return rawValue;
        }
        return new RefImpl(rawValue, shallow);
    }
    var RefImpl = /** @class */ (function () {
        function RefImpl(value, __v_isShallow) {
            this.__v_isShallow = __v_isShallow;
            // 是否为 ref 类型数据的标记
            this.__v_isRef = true;
            // 是否为浅层 ref 类型 若是直接返回值 否则返回 reactive 对象
            this._value = __v_isShallow ? value : toReactive(value);
            // 存储原始数据
            this._rawValue = value;
        }
        Object.defineProperty(RefImpl.prototype, "value", {
            // 通过 get 和 set 标识将 value 函数可以通过属性的方式调用触发
            get: function () {
                // 收集 ref依赖
                trackRefValue(this);
                // 若非复杂对象会触发对应的 Proxy 的 get 方法
                return this._value;
            },
            set: function (newVal) {
                /**
                 * newVal 为新数据
                 * this._rawValue 为原始数据
                 * 对比数据是否发生变化
                 */
                if (hasChanged(newVal, this._rawValue)) {
                    this._rawValue = newVal;
                    // 对修改为复杂类型数据进行判断
                    this._value = toReactive(newVal);
                    triggerRefValue(this);
                }
            },
            enumerable: false,
            configurable: true
        });
        return RefImpl;
    }());
    /**
     * 为 ref 的 value 进行触发依赖
     * @param ref
     */
    function triggerRefValue(ref) {
        if (ref.dep) { //判断是否存在和该属性绑定的依赖函数
            triggerEffects(ref.dep);
        }
    }
    /**
     * 收集 ref 依赖
     * @param ref
     */
    function trackRefValue(ref) {
        if (activeEffect) {
            trackEffects(ref.dep || (ref.dep = createDep()));
        }
    }
    function isRef(value) {
        return !!(value && value.__v_isRef === true);
    }

    /**
     * 计算属性类
     */
    var ComputedRefImpl = /** @class */ (function () {
        function ComputedRefImpl(getter) {
            var _this = this;
            this.dep = undefined;
            // 脏：为 false 时，表示会触发依赖；为 true 时表示会重新执行 run 方法获取数据
            this._dirty = true;
            this.__v_isRef = true;
            this.effect = new ReactiveEffect(getter, function () {
                if (!_this._dirty) {
                    _this._dirty = true;
                    triggerRefValue(_this);
                }
            });
            this.effect.computed = this;
        }
        Object.defineProperty(ComputedRefImpl.prototype, "value", {
            get: function () {
                // 收集依赖
                trackRefValue(this);
                // 初始化后 默认为 true
                if (this._dirty) {
                    // 惰性求值？
                    this._dirty = false;
                    // 会重新计算值
                    this._value = this.effect.run();
                }
                return this._value;
            },
            enumerable: false,
            configurable: true
        });
        return ComputedRefImpl;
    }());
    /**
     * 计算属性
     * @param getterOrOptions
     * @returns
     */
    function computed(getterOrOptions) {
        var getter;
        // computed 传过来的匿名函数
        var onlyGetter = isFunction(getterOrOptions);
        if (onlyGetter) {
            // 如果是函数赋值给 getter
            getter = getterOrOptions;
        }
        var cRef = new ComputedRefImpl(getter);
        return cRef;
    }

    // 对应 promise 的 pending 状态
    var isFlushPending = false;
    // 创建异步任务 安排异步任务在当前同步代码执行完毕后立即执行
    var resolvedPromise = Promise.resolve();
    // 待执行的任务队列
    var pendingPreFlushCbs = [];
    /**
     * 队列预处理函数
     * @param cb
     */
    function queuePreFlushCb(cb) {
        queueCb(cb, pendingPreFlushCbs);
    }
    /**
     * 队列处理函数
     * @param cb
     * @param pendingQueue
     */
    function queueCb(cb, pendingQueue) {
        // 将回调函数放入队列
        pendingQueue.push(cb);
        queueFlush();
    }
    /**
     * 处理当前执行函数，并对 currentFlushPromise 进行复赋值
     */
    function queueFlush() {
        if (!isFlushPending) {
            isFlushPending = true;
            // 防止阻止主线执行 将其扔到微任务中去执行
            resolvedPromise.then(flushJobs);
        }
    }
    /**
     * 执行回调函数，并修改执行状态
     */
    function flushJobs() {
        isFlushPending = false;
        flushPreFlushCbs();
    }
    /**
     * 依次处理队列中的任务
     */
    function flushPreFlushCbs() {
        if (pendingPreFlushCbs.length) {
            // 若待执行队列长度不为空 去重（防止绑定多依赖的回调函数被重复执行）
            var activePreFlushCbs = __spreadArray([], __read(new Set(pendingPreFlushCbs)), false);
            pendingPreFlushCbs.length = 0;
            for (var i = 0; i < activePreFlushCbs.length; i++) {
                activePreFlushCbs[i]();
            }
        }
    }

    /**
     * 指定 watch 函数
     * @param source 监听的响应性数据
     * @param cd 回调函数
     * @param options 配置迹象
     * @returns
     */
    function watch(source, cb, options) {
        return doWatch(source, cb, options);
    }
    function doWatch(source, cb, _a) {
        var _b = _a === void 0 ? EMPTY_OBJ : _a, immediate = _b.immediate, deep = _b.deep;
        var getter;
        if (isReactive(source)) {
            // getter 是一个返回 source 的函数
            getter = function () { return source; };
            deep = true;
        }
        else {
            getter = function () { };
        }
        if (cb && deep) {
            var baseGetter_1 = getter;
            // 使用 traverse 递归访问触发 source 属性的 getter 方法
            getter = function () { return traverse(baseGetter_1()); };
        }
        var oldValue = {};
        // job 函数
        var job = function () {
            if (cb) {
                var newValue = effect.run();
                if (deep || hasChanged(newValue, oldValue)) {
                    cb(newValue, oldValue);
                    oldValue = newValue;
                }
            }
        };
        var scheduler = function () { return queuePreFlushCb(job); };
        var effect = new ReactiveEffect(getter, scheduler);
        if (cb) {
            if (immediate) {
                // 直接执行一次
                job();
            }
            else {
                oldValue = effect.run();
            }
        }
        else {
            effect.run();
        }
        return function () {
            effect.stop();
        };
    }
    /**
     * 依次执行 getter 从而触发依赖收集
     */
    function traverse(value) {
        if (!isObject(value)) {
            return value;
        }
        for (var key in value) {
            traverse(value[key]);
        }
        return value;
    }

    function normalizeClass(value) {
        var res = '';
        if (isString(value)) {
            res = value;
        }
        // class 数组增强
        else if (isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                // 循环数组里的值 递归获取 class 的值
                var normalized = normalizeClass(value[i]);
                if (normalized) {
                    res += normalized + ' ';
                }
            }
        }
        // class 对象增强
        else if (isObject(value)) {
            for (var name_1 in value) {
                // 得到对象的每个 key
                if (value[name_1]) {
                    res += name_1 + ' ';
                }
            }
        }
        // 去除字符串左右空格
        return res.trim();
    }

    // 用 Symbol 创建唯一标识符
    var Fragment = Symbol('Fragment');
    var Text$1 = Symbol('Text');
    var Comment$1 = Symbol('Comment');
    function isVNode(value) {
        return value ? value.__v_isVNode === true : false;
    }
    /**
     * 生成 VNode 对象并返回
     * @param type node.type
     * @param props 标签属性或自定义属性
     * @param children 子节点
     * @returns vnode 对象
     */
    function createVNode(type, props, children) {
        var shapeFlag = isString(type) ? 1 /* ShapeFlags.ELEMENT */ : isObject(type) ? 4 /* ShapeFlags.STATEFUL_COMPONENT */ : 0;
        if (props) {
            var klass = props.class; props.style;
            if (klass && !isString(klass)) {
                props.class = normalizeClass(klass);
            }
        }
        return createBaseVNode(type, props, children, shapeFlag);
    }
    /**
     * 构建基础的 vnode
     * @param type
     * @param props
     * @param children
     * @param shapeFlag
     * @returns
     */
    function createBaseVNode(type, props, children, shapeFlag) {
        var vnode = {
            __v_isVNode: true,
            type: type,
            props: props,
            shapeFlag: shapeFlag,
            key: (props === null || props === void 0 ? void 0 : props.key) || null
        };
        normalizeChildren(vnode, children);
        return vnode;
    }
    /**
     *
     * @param vnode
     * @param children
     */
    function normalizeChildren(vnode, children) {
        var type = 0;
        if (children == null) {
            children = null;
        }
        else if (isArray(children)) {
            type = 16 /* ShapeFlags.ARRAY_CHILDREN */; // 数组子节点位运算后为 16
        }
        else if (typeof children === 'object') ;
        else if (isFunction(children)) ;
        else {
            children = String(children);
            type = 8 /* ShapeFlags.TEXT_CHILDREN */;
        }
        vnode.children = children;
        vnode.shapeFlag |= type;
        /**
         * Element 1 按位或 子节点为 Array 16  = 17 下面这个 vnode 的 shapeFlag 为 17
         * const vnode = h('div', { class: 'test' }, [
            h('p', 'p1'),
            h('p', 'p2'),
            h('p', 'p3')
          ])
         */
    }
    /**
     * 创建注释节点
     * @param text 注释文本
     * @returns 注释节点
     */
    function createCommentVNode(text) {
        return createVNode(Comment$1, null, text);
    }

    function h(type, propsOrChildren, children) {
        // 获取传递参数的数量
        var l = arguments.length;
        // 参数为二 第二个参数可能是 props 也可能是 children
        if (l === 2) {
            // 第二个参数是对象且不是数组 有两种可能性：1、vnode 2、普通的 props
            if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
                // single vnode without props
                // 若为 vnode 默认让其当作子节点
                if (isVNode(propsOrChildren)) {
                    return createVNode(type, null, [propsOrChildren]);
                }
                // props without children
                return createVNode(type, propsOrChildren);
            }
            else {
                // omit props
                // 第二个参数为 children
                return createVNode(type, null, propsOrChildren);
            }
        }
        else {
            if (l > 3) {
                // 大于三个后续参数都作为 children 用 call 修改Array 的 this 指向， 获取第三个参数及以后的参数生产新的数组作为 children 的值
                children = Array.prototype.slice.call(arguments, 2);
            }
            else if (l === 3 && isVNode(children)) {
                // 统一 children 的类型 均为数组处理
                children = [children];
            }
            return createVNode(type, propsOrChildren, children);
        }
    }

    // 封装 element 操作
    var doc = document;
    var nodeOps = {
        // 插入元素到指定位置
        insert: function (child, parent, anchor) {
            parent.insertBefore(child, anchor || null);
        },
        // 创建指定的 Element
        createElement: function (tag) {
            var el = doc.createElement(tag);
            return el;
        },
        // 为指定的 element 设置 textContent
        setElementText: function (el, text) {
            el.textContent = text;
        },
        // 创建指定 Text 元素
        createText: function (text) { return doc.createTextNode(text); },
        // 设置 text
        setText: function (node, text) {
            node.nodeValue = text;
        },
        // 创建指定 Comment 元素
        createComment: function (text) { return doc.createComment(text); },
        // 删除指定元素: 需要获取起父级元素
        remove: function (el) {
            var parent = el.parentNode;
            if (parent) {
                parent.removeChild(el);
            }
        }
    };

    function patchClass(el, value) {
        if (value == null) {
            el.removeAttribute('class');
        }
        else {
            // TODO 若存在多个 class 会全部存在 value 里吗？
            el.className = value;
        }
    }

    // 设置元素属性
    function patchAttr(el, key, value) {
        if (value == null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, value);
        }
    }

    // 通过 DOM Properties 指定属性
    function patchDOMProp(el, key, value) {
        try {
            el[key] = value;
        }
        catch (e) {
            console.error(e);
        }
    }

    function patchStyle(el, prev, next) {
        var style = el.style;
        var isCssString = isString(next);
        /* vue 支持两种设置语法
         * 1. 对象语法 :style="{ color: activeColor, fontSize: fontSize + 'px' }"
         * 2. 字符串语法 :style="'color: red; font-size: 14px;'"
         */
        if (next && !isCssString) {
            for (var key in next) {
                setStyle(style, key, next[key]);
            }
            // 删除旧样式
            if (prev && !isString(prev)) {
                for (var key in prev) {
                    if (!next[key]) {
                        setStyle(style, key, '');
                    }
                }
            }
        }
    }
    function setStyle(style, name, val) {
        style[name] = val;
    }

    // 为 event 事件打补丁
    function patchEvent(el, rawName, prevValue, nextValue) {
        // vei 为 vue event invokers
        var invokers = el._vei || (el._vei = {});
        var existingInvoker = invokers[rawName];
        // 判断当前事件是否存在
        if (existingInvoker && nextValue) {
            // 若存在且有新的事件 直接更新值
            existingInvoker.value = nextValue;
        }
        else {
            // 获取事件名
            var name_1 = parseName(rawName);
            // 若否 先判断是否有限制 
            if (nextValue) {
                // 若有直接添加
                var invoker = (invokers[rawName] = createInvoker(nextValue));
                el.addEventListener(name_1, invoker);
            }
            else if (existingInvoker) {
                // 若无直接删除
                el.removeEventListener(name_1, existingInvoker);
                invokers[rawName] = undefined;
            }
        }
    }
    // 切割事件名
    function parseName(name) {
        return name.slice(2).toLowerCase();
    }
    // 穿件事件存储对象
    function createInvoker(initialValue) {
        // invoker 是一个函数 参数为 e 只有当 invoker.value 存在时 才会执行 invoker.value()
        var invoker = function (e) {
            invoker.value && invoker.value();
        };
        // value 为事件
        invoker.value = initialValue;
        return invoker;
    }

    // 封装 props 操作
    var patchProp = function (el, key, prevValue, nextValue) {
        if (key === 'class') {
            // class 是字符串可以直接替换 不需要 prevValue
            patchClass(el, nextValue);
        }
        else if (key === 'style') {
            // style
            patchStyle(el, prevValue, nextValue);
        }
        else if (isOn(key)) {
            // 事件
            patchEvent(el, key, prevValue, nextValue);
        }
        else if (shouldSetAsProp(el, key)) {
            // 通过 DOM properties 设置
            patchDOMProp(el, key, nextValue);
        }
        else {
            // 其他属性
            patchAttr(el, key, nextValue);
        }
    };
    /**
     * 判断是否应该通过 DOM properties 设置
     * @param el
     * @param key
     * @param value
     */
    function shouldSetAsProp(el, key, value) {
        // TODO #1787,#2840 表单元素的表单属性是只读的，必须设置为属性为 attribute
        if (key === 'form') {
            return false;
        }
        // TODO #1526 必须设置为 attribute
        if (key === 'list' && el.tagName === 'INPUT') {
            return false;
        }
        // TODO #2766 必须设置为 attribute
        if (key === 'type' && el.tagName === 'TEXTAREA') {
            return false;
        }
        return key in el;
    }

    // 标准化 VNode
    function normalizeVNode(child) {
        if (typeof child === 'object') {
            return cloneIfMounted(child);
        }
        else {
            return createVNode(Text, null, String(child));
        }
    }
    // clone VNode
    function cloneIfMounted(child) {
        return child;
    }
    // 解析 render 函数的返回值
    function renderComponentRoot(instance) {
        // 因为存在 with 平接插值表达式，需要保证 data 不为 undefined
        var vnode = instance.vnode, render = instance.render, _a = instance.data, data = _a === void 0 ? {} : _a;
        var result;
        try {
            // 按位与 思路：在 Vue 的虚拟 DOM 实现中，每个 vnode 都有一个 shapeFlag 属性，它是一个位掩码，用于标识该节点的类型和特性。
            // 当使用 & 操作符时，如果结果为非零值，表示该 vnode 确实具有 STATEFUL_COMPONENT 这个特性。
            if (vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
                // 修改 render 的 this，并获取返回值, 传入 data 对象作为上下文；如果 render 中使用了 this，则需要改变 this 指向
                result = normalizeVNode(render.call(data, data));
            }
        }
        catch (err) {
            console.log(err);
        }
        return result;
    }

    // 将 Hook 绑定到指定实例上
    function injectHook(type, hook, target) {
        if (target) {
            // 注意：此处的 this 指向的是proxy 代理对象
            // 所以 mock 实例中  created() { alert('created', this.msg) }中的 this能拿到 msg 的内容
            target[type] = hook;
            return hook;
        }
    }
    // 创建 Hook，将指定 lifecycle 通过 injectHook 绑定到 target 上
    // 柯里化工厂函数 内有闭包
    var createHook = function (lifecycle) {
        return function (hook, target) { return injectHook(lifecycle, hook, target); };
    };
    /**
     * onBeforeMount = (hook, target) => injectHook(LifecycleHooks.BEFOREMOUNT, hook?.bind(instance.data), instance)
     * instance.data 是代理对象
     * instance[bm] = hook
     */
    var onBeforeMount = createHook("bm" /* LifecycleHooks.BEFOREMOUNT */);
    var onMounted = createHook("m" /* LifecycleHooks.MOUNTED */);

    var uid = 0;
    // 创建组件实例
    function createComponentInstance(vnode) {
        var type = vnode.type;
        var instance = {
            uid: uid++,
            vnode: vnode,
            type: type,
            subTree: null,
            effect: null,
            update: null,
            render: null,
            // 增加生命周期函数
            isMounted: false,
            bc: null,
            c: null,
            bm: null,
            m: null // mounted
        };
        return instance;
    }
    // 初始化组件属性
    function setupComponent(instance) {
        // 将 render 赋值到 instance.render 上
        var setupResult = setupStatefullComponent(instance);
        return setupResult;
    }
    function setupStatefullComponent(instance) {
        var Component = instance.type;
        var setup = Component.setup;
        if (setup) {
            var setupResult = setup();
            handleSetupResult(instance, setupResult);
        }
        else {
            // 获取组件实例
            finishComponentSetup(instance);
        }
    }
    // 判断 setupResult是否为函数 若是将 setup 函数的返回值赋值给instance.render
    function handleSetupResult(instance, setupResult) {
        if (isFunction(setupResult)) {
            instance.render = setupResult;
        }
        finishComponentSetup(instance);
    }
    // 为 instance 绑定 render 属性
    function finishComponentSetup(instance) {
        var Component = instance.type;
        // 判断 render 不存在时才会赋值
        if (!instance.render) {
            // 存在编辑器，且组件中不包含 render 函数，同时包含 template 模版，则直接使用编辑器进行编辑，得到 render 函数
            if (compile$1 && !Component.render) {
                if (Component.template) {
                    // 将 runtime 模块和 compile 模块关联起来
                    var template = Component.template;
                    Component.render = compile$1(template);
                }
            }
            instance.render = Component.render;
        }
        // 处理 instance 上的 data 属性
        applyOptions(instance);
    }
    function applyOptions(instance) {
        var _a = instance.type, dataOptions = _a.data, beforeCreate = _a.beforeCreate, created = _a.created, beforeMount = _a.beforeMount, mounted = _a.mounted;
        // dataOptions 是组件里的 data 函数
        if (dataOptions) {
            // 获取data
            var data = dataOptions();
            if (isObject(data)) {
                // 如果是个对象 就对其响应式处理 并赋值给 data
                instance.data = reactive(data);
            }
        }
        // 生命周期钩子
        if (beforeCreate) {
            callHook(beforeCreate, instance.data);
        }
        if (created) {
            callHook(created, instance.data);
        }
        function registerLifecycleHook(register, hook) {
            // 柯里化工厂函数 目的是实现将生命周期挂载到 instance 实例上 
            // 目的：instace[bm] = hook
            register(hook === null || hook === void 0 ? void 0 : hook.bind(instance.data), instance);
        }
        registerLifecycleHook(onBeforeMount, beforeMount);
        registerLifecycleHook(onMounted, mounted);
    }
    function callHook(hook, proxy) {
        // 指定 this 并调用生命周期； proxy 是包含 msg 的 data
        hook.bind(proxy)();
    }
    var compile$1;
    // 用于注册编译器的运行时
    function registerRuntimeCompiler(_compile) {
        compile$1 = _compile;
    }

    /**
     * 创建 app 实例，返回一个函数
     * @param render 渲染函数
     * @returns
     */
    function createAppAPI(render) {
        return function createApp(rootComponent, rootProps) {
            if (rootProps === void 0) { rootProps = null; }
            var app = {
                _component: rootComponent,
                _container: null,
                // 挂载
                mount: function (rootContainer) {
                    // 直接通过 createVNode 创建 vnode
                    var vnode = createVNode(rootComponent, rootProps);
                    // 通过 render 函数渲染
                    render(vnode, rootContainer);
                }
            };
            return app;
        };
    }

    // 创建渲染器
    /**
     * 注意：传入的 options 必须包含 RendererOptions 的所有属性
     *  Partial<RendererOptions> 可以只包含部分属性
     * @param options 这个 options 从 packages/runtime-dom/src/index.ts 传入，属性是 nodeOps 和 patchProps 的合并对象
     * @returns
     */
    function createRenderer(options) {
        return baseCreateRenderer(options);
    }
    /**
     * 生成 renderer 渲染器
     * @param options 兼容性操作配置对象
     */
    function baseCreateRenderer(options) {
        // 解构 options
        var hostInsert = options.insert, hostPatchProp = options.patchProp, hostCreateElement = options.createElement, hostSetElementText = options.setElementText, hostCreateText = options.createText, hostSetText = options.setText, hostCreateComment = options.createComment, hostRemove = options.remove;
        // Element 打补丁
        var processElement = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 挂载操作
                mountElement(newVNode, container, anchor);
            }
            else {
                // 更新操作
                patchElement(oldVNode, newVNode);
            }
        };
        // Text 打补丁  注意：Text 节点属于叶子结点，不存在内部子节点
        var processText = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 生成节点 并挂载
                newVNode.el = hostCreateText(newVNode.children);
                hostInsert(newVNode.el, container, anchor);
            }
            else {
                /**
                 * 对 oldVnode.el 做非空判断；
                 * 赋值给 newVNode.el;
                 * 注意：JS 的赋值语句会返回被赋予的值
                 */
                var el = (newVNode.el = oldVNode.el);
                if (newVNode.children !== oldVNode.children) {
                    // 更新操作 参数一：目标元素 参数二：Text节点内容
                    hostSetText(el, newVNode.children);
                }
            }
        };
        // Comment 打补丁
        var processCommentNode = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                // 挂载
                newVNode.el = hostCreateComment(newVNode.children || '');
                hostInsert(newVNode.el, container, anchor);
            }
            else {
                // 无更新
                newVNode.el = oldVNode.el;
            }
        };
        // Fragment 打补丁：都是对子节点的操作
        var processFragment = function (oldVNode, newVNode, container, anchor) {
            if (oldVNode == null) {
                mountChildren(newVNode.children, container, anchor);
            }
            else {
                // 对比更新
                patchChildren(oldVNode, newVNode, container, anchor);
            }
        };
        // 组件打补丁
        var processComponent = function (oldVNode, newVNode, contianer, anchor) {
            if (oldVNode == null) {
                // 挂载组件
                mountComponent(newVNode, contianer, anchor);
            }
        };
        // 挂载元素
        var mountElement = function (vnode, container, anchor) {
            var type = vnode.type, props = vnode.props, shapeFlag = vnode.shapeFlag;
            // 创建 element
            var el = (vnode.el = hostCreateElement(type));
            if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                // 设置为文本节点
                hostSetElementText(el, vnode.children);
            }
            else if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 设置为数组节点
                mountChildren(vnode.children, el, anchor);
            }
            // 处理 props
            if (props) {
                for (var key in props) {
                    hostPatchProp(el, key, null, props[key]);
                }
            }
            // 插入 el 到指定位置
            hostInsert(el, container, anchor);
        };
        // 挂载组件
        var mountComponent = function (initialVNode, container, anchor) {
            // 生成组件实例
            initialVNode.component = createComponentInstance(initialVNode);
            var instance = initialVNode.component;
            // 标准化组件实例数据
            setupComponent(instance);
            // 设置组件渲染
            setupRenderEffect(instance, initialVNode, container, anchor);
        };
        var patch = function (oldVNode, newVNode, container, anchor) {
            if (anchor === void 0) { anchor = null; }
            if (oldVNode === newVNode) {
                return;
            }
            // 判断若不是相同类型的节点，则卸载旧节点
            if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
                unmount(oldVNode);
                oldVNode = null;
            }
            var shapeFlag = newVNode.shapeFlag, type = newVNode.type;
            switch (type) {
                case Text:
                    processText(oldVNode, newVNode, container, anchor);
                    break;
                case Comment:
                    processCommentNode(oldVNode, newVNode, container, anchor);
                    break;
                case Fragment:
                    processFragment(oldVNode, newVNode, container, anchor);
                    break;
                default:
                    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                        processElement(oldVNode, newVNode, container, anchor);
                    }
                    else if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
                        // 组件
                        processComponent(oldVNode, newVNode, container, anchor);
                    }
            }
        };
        var render = function (vnode, container) {
            if (vnode == null) {
                // 卸载
                if (container._vnode) {
                    unmount(container._vnode);
                }
            }
            else {
                // 打补丁（包括更新和挂载）
                patch(container._vnode || null, vnode, container);
            }
            container._vnode = vnode;
        };
        var unmount = function (vnode) {
            hostRemove(vnode.el); // 确保 el 存在
        };
        // 对比节点 进行更新操作
        var patchElement = function (oldVNode, newVNode) {
            // 获取旧的 DOM元素，复用这个 DOM 给新的虚拟节点 el 属性赋值；同时将这个
            var el = (newVNode.el = oldVNode.el);
            var oldProps = oldVNode.props || EMPTY_OBJ;
            var newProps = newVNode.props || EMPTY_OBJ;
            // 更新子节点
            patchChildren(oldVNode, newVNode, el, null);
            // 更新 props
            patchProps(el, newVNode, oldProps, newProps);
        };
        var mountChildren = function (children, container, anchor) {
            if (isString(children)) {
                children = children.split('');
            }
            for (var i = 0; i < children.length; i++) {
                var child = (children[i] = normalizeVNode(children[i]));
                patch(null, child, container, anchor);
            }
        };
        var patchChildren = function (oldVNode, newVNode, container, anchor) {
            // 旧节点
            var c1 = oldVNode && oldVNode.children;
            var prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0;
            // 新节点
            var c2 = newVNode.children;
            var shapeFlag = newVNode.shapeFlag;
            // 新节点是文本节点
            if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                // 若 c1 不等于 c2 guagua
                if (c1 !== c2) {
                    // 设置为文本节点
                    hostSetElementText(container, c2);
                }
            }
            else {
                // 旧节点是数组节点
                if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                    // 新节点是是数组节点
                    if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                        //  进行 diff 计算
                        patchKeyedChildren(c1, c2, container, anchor);
                    }
                }
                else {
                    // 旧节点为 Text_CHILDREN
                    if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                        // 删除旧节点的文本
                        hostSetElementText(container, '');
                    }
                }
            }
        };
        // 为 props 打补丁
        var patchProps = function (el, vnode, oldProps, newProps) {
            if (oldProps !== newProps) {
                // 1、遍历新的 props 赋值
                for (var key in newProps) {
                    var prev = oldProps[key];
                    var next = newProps[key];
                    if (prev !== next) {
                        hostPatchProp(el, key, prev, next);
                    }
                }
                // 遍历旧的 props 若新的里面不存在，则删除
                for (var key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        };
        var setupRenderEffect = function (instance, initialVNode, container, anchor) {
            // 组件挂载和更新的方法
            var componentUpdateFn = function () {
                // 挂载之前
                if (!instance.isMounted) {
                    var bm = instance.bm, m = instance.m;
                    // 处理 bm
                    if (bm) {
                        bm();
                    }
                    // 获取渲染内容
                    var subTree = (instance.subTree = renderComponentRoot(instance));
                    // 通过 patch 对 subTree 打补丁
                    patch(null, subTree, container, anchor);
                    // 处理挂载
                    if (m) {
                        m();
                    }
                    // 根节点赋值
                    initialVNode.el = subTree.el;
                    // 修改 mounted 状态
                    instance.isMounted = true;
                }
                else {
                    var next = instance.next, vnode = instance.vnode;
                    if (!next) {
                        next = vnode;
                    }
                    // 获取最新的 subTree
                    var nextTree = renderComponentRoot(instance);
                    // 保存对应的 subTree 以便进行更新
                    var prevTree = instance.subTree;
                    instance.subTree = nextTree;
                    // 通过 patch 进行更新
                    patch(prevTree, nextTree, container, anchor);
                    // 更新 next
                    next.el = nextTree.el;
                }
            };
            // 创建包含 scheduler 的 effect 实例
            // 使用ReactiveEffect 的构造函数 将 componentUpdateFn 作为 fn 传入，() => queuePreFlushCb(update) 作为 scheduler 传入
            var effect = (instance.effect = new ReactiveEffect(componentUpdateFn, function () { return queuePreFlushCb(update); }));
            // 生成 update 函数
            var update = (instance.update = function () { return effect.run(); });
            // 本质触发 componentUpdateFn
            update();
        };
        // TODO 对比节点 进行更新操作
        var patchKeyedChildren = function (oldChildren, newChildren, container, parentAnchor) {
            // 数组索引
            var i = 0;
            var newChildrenLength = newChildren.length;
            var oldChildrenEndIndex = oldChildren.length - 1;
            var newChildrenEndIndex = newChildrenLength - 1;
            // 从前向后遍历 遇到不同类型的跳出
            // 1. sync from start
            // (a b) c
            // (a b) d e
            while (i <= oldChildrenEndIndex && i <= newChildrenEndIndex) {
                var oldVNode = oldChildren[i];
                var newVNode = normalizeVNode(newChildren[i]);
                // 如果 oldVNode 和 newVNode 相同类型直接 patch 替换
                if (isSameVNodeType(oldVNode, newVNode)) {
                    patch(oldVNode, newVNode, container, null);
                }
                else {
                    break;
                }
                i++;
            }
            // 从后向前遍历 遇到不同类型的跳出
            // 2. sync from end
            // a (b c)
            // d e (b c)
            while (i <= oldChildrenEndIndex && i <= newChildrenEndIndex) {
                var oldVNode = oldChildren[oldChildrenEndIndex];
                var newVNode = normalizeVNode(newChildren[newChildrenEndIndex]);
                if (isSameVNodeType(oldVNode, newVNode)) {
                    patch(oldVNode, newVNode, container, null);
                }
                else {
                    break;
                }
                oldChildrenEndIndex--;
                newChildrenEndIndex--;
            }
            // 3. common sequence + mount 新节点多余旧节点
            // (a b)
            // (a b) c 先执行 1.sync from start 在执行 3. common sequence + mount
            // 到3 时 i = 2, e1 = 1, e2 = 2
            // (a b)
            // c (a b) 先执行 2.sync from start 在执行 3. common sequence + mount
            // 到 3 时 i = 0, e1 = -1, e2 = 0
            if (i > oldChildrenEndIndex) {
                if (i <= newChildrenEndIndex) {
                    // 判断新节点在头部还是尾部  注意：节点的插入方式 insertBefore，插入到给定元素的前面
                    //  头部：从尾部开始对比 nextPos < newChildrenLength，anchor 是 newChildren[nextPos].el ；
                    //  尾部：从头部开始对比 nextPos = newChildrenLength，anchor 用父节点 parentAnchor 默认回插入到容器结尾
                    var nextPos = newChildrenEndIndex + 1;
                    var anchor = nextPos < newChildrenLength ? newChildren[nextPos].el : parentAnchor;
                    while (i <= newChildrenEndIndex) {
                        patch(null, normalizeVNode(newChildren[i]), container, anchor);
                        i++;
                    }
                }
            }
            // 4. common sequence + unmount 旧节点过于新节点
            // (a b) c
            // (a b)
            // i = 2, e1 = 2, e2 = 1
            // a (b c)
            // (b c)
            // i = 0, e1 = 0, e2 = -1
            else if (i > newChildrenEndIndex) {
                while (i <= oldChildrenEndIndex) {
                    unmount(oldChildren[i]); // 调用的是 nodeOps 的 remove 方法
                    i++;
                }
            }
            // 5. unknown sequence 乱序处理 借助最长递增子序列减少对比次数
            // [i ... e1 + 1]: a b [c d e] f g
            // [i ... e2 + 1]: a b [e d c h] f g
            // i = 2, e1 = 4, e2 = 5
            else {
                var oldStartIndex = i;
                var newStartIndex = i;
                // 5.1 将新节点的 key 和 index 映射到 keyToNewIndexMap 中 通过该对象可知：新的 child 节点更新后的位置（根据 key 为新节点 child.key、index 为新节点的 index）
                var keyToNewIndexMap = new Map();
                // 将新节点的 key 和 index 映射到 map 中
                for (i = newStartIndex; i <= newChildrenEndIndex; i++) {
                    var nextChild = normalizeVNode(newChildren[i]);
                    keyToNewIndexMap.set(nextChild.key, i);
                }
                // 5.2 循环旧节点 尝试 patch (打补丁) 和 unmount (卸载)
                var j 
                // 已打补丁的节点数量
                = void 0;
                // 已打补丁的节点数量
                var patched = 0;
                // 待打补丁的节点数量
                var toBePatched = newChildrenEndIndex - newStartIndex + 1;
                // 标记：是否移动
                var moved = false;
                // 保存最大的 index 值
                var maxNewIndexSoFar = 0;
                // 待处理节点的索引映射，index 对应待处理节点在 新乱序节点数组 中的索引；值为 0 表示新节点未处理
                var newIndexToOldIndexMap = new Array(toBePatched);
                for (i = 0; i < toBePatched; i++) {
                    // 初始化 newIndexToOldIndexMap 为 0 表示新节点未处理
                    newIndexToOldIndexMap[i] = 0;
                }
                for (i = oldStartIndex; i <= oldChildrenEndIndex; i++) {
                    var prevChild = oldChildren[i];
                    if (patched >= toBePatched) {
                        // 所有节点处理完成 其余卸载
                        unmount(prevChild);
                        continue;
                    }
                    // 找到新节点在新节点数组里的位置 newIndex
                    var newIndex = void 0;
                    if (prevChild.key != null) {
                        // 旧节点 key 存在，根据 key 获取新节点需要的位置
                        newIndex = keyToNewIndexMap.get(prevChild.key);
                    }
                    else {
                        // 旧节点 key 不存在，遍历还未处理的新节点，找到相同类型（type相同且 key 都不存在的情况）的节点处理
                        for (j = newStartIndex; j <= newChildrenEndIndex; j++) {
                            if (newIndexToOldIndexMap[j - newStartIndex] === 0 && isSameVNodeType(prevChild, newChildren[j])) {
                                // TODO
                                newIndex = j;
                                break;
                            }
                        }
                    }
                    if (newIndex === undefined) {
                        // 若未找到 则卸载
                        if (prevChild.el) { // 特殊处理 对于动态节点，el 为空，则不卸载
                            unmount(prevChild);
                        }
                        continue;
                    }
                    else {
                        // newIndex 包括处理过的节点，所以需要减去 newStartIndex 获取到新节点在 newChildren 中的索引
                        // 让打过补丁的节点值 > 0证明已被处理  与未被处理的0做区分
                        newIndexToOldIndexMap[newIndex - newStartIndex] = i + 1;
                        if (newIndex >= maxNewIndexSoFar) {
                            // 持续递增
                            maxNewIndexSoFar = newIndex;
                        }
                        else {
                            // 若新节点索引小于 maxNewIndexSoFar 则说明有乱序需要移动
                            moved = true;
                        }
                        // 打补丁
                        patch(prevChild, newChildren[newIndex], container, null);
                        // 自增处理过的数据
                        patched++;
                    }
                }
                // 5.3针对移动和挂载操作
                // 获取最长递增子序列
                var increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR;
                // 移动和挂载新节点
                j = increasingNewIndexSequence.length - 1;
                // 从后向前遍历 逆序差值或移动节点
                for (i = toBePatched - 1; i >= 0; i--) {
                    // 获取当先前新节点的下标 nextIndex
                    var nextIndex = i + newStartIndex;
                    var nextChild = newChildren[nextIndex];
                    var anchor = nextIndex + 1 < newChildrenLength ? newChildren[nextIndex + 1].el : parentAnchor;
                    // 判断新节点在 diff 过程中没有被旧节点复用，可以直接挂载
                    if (newIndexToOldIndexMap[i] === 0) {
                        // 挂载新节点
                        patch(null, nextChild, container, anchor);
                    }
                    else if (moved) {
                        // TODO 为什么new-b 不动 new-c 动了
                        // i !== increasingNewIndexSequence[j] 说明当前节点不是最长递增子序列的节点里的最大值（最后一个元素）
                        if (j < 0 || i !== increasingNewIndexSequence[j]) {
                            // 移动节点
                            move(nextChild, container, anchor);
                        }
                        else {
                            // 若存在最长递增子序列 则 j-- 继续向前遍历
                            j--;
                        }
                    }
                }
            }
        };
        // 移动节点到指定位置
        var move = function (vnode, container, anchor) {
            var el = vnode.el;
            hostInsert(el, container, anchor);
        };
        return {
            render: render,
            createApp: createAppAPI(render)
        };
    }
    // diff 对比 获取最长递增子序列
    function getSequence(arr) {
        /* 浅拷贝解释：p 里若是引用类型，则 p[0] 和 arr[0] 指向同一个对象，若直接修改 p[0].a， arr 就会跟着修改,如下面；
                    但如果直接修改 p[0] 则 arr[0].a 不会跟着修改，它意味着直接改变了 p[0] 的指向，而不是修改 p[0].a 的值
                    const arr = [{a: 1}, {b: 2}]
                    const p = arr.slice()
                    p[0].a = 100
                    console.log(arr[0].a) // 100
        */
        /* 补充：深拷贝解释：p 里若是引用类型，则 p 和 arr 指向不同的对象 修改会不影响 */
        // p 是浅拷贝 arr 的值
        var p = arr.slice();
        // 最长递增子序列的下标集合，初始值为 0
        var result = [0];
        var i, j, u, v, c;
        // 数组长度
        var len = arr.length;
        for (i = 0; i < len; i++) {
            var arrI = arr[i];
            if (arrI !== 0) {
                // 获取 result 最后一个元素，result里的最大值下标
                j = result[result.length - 1];
                if (arr[j] < arrI) {
                    // 存在比当前 result[result.length - 1] 大的值，则直接添加到 result 中
                    // 保存当前 arr[i] 的前驱索引 j 到 p[i]
                    p[i] = j;
                    // 保存当前 arr[i] 的值到 result 中
                    result.push(i);
                    continue; // 跳过后续的代码，进入下一次循环
                }
                /* 若不满足 arr[j] < arr[i] 则说明 result 中的最后位置的值比当前 arr[i] 大，则需要更新 result 中的值 */
                // 二分查找，找到第一个大于 arrI 的值
                u = 0;
                v = result.length - 1;
                while (u < v) {
                    // 获取 result 的中间索引 并向下取整  位运算右移，相当于 (u + v) / 2 向下取整
                    c = (u + v) >> 1;
                    if (arr[result[c]] < arrI) {
                        // 若大于中位数 u 向右遍历
                        u = c + 1;
                    }
                    else {
                        // 若小于中位数 设置右侧边界 v = 中位数 c 缩小范围
                        v = c;
                    }
                }
                if (arr[result[u]] > arrI) {
                    // u === 0 说明没有前驱 则直接更新 result[u]
                    if (u > 0) {
                        // u > 0 说明当前元素要放在递增子序列的第 u 个位置
                        // 若 result[u] 大于 arrI 则更新 result[u]
                        p[i] = result[u - 1];
                    }
                    result[u] = i;
                }
            }
        }
        // 获取最长递增子序列的下标集合
        u = result.length;
        v = result[u - 1];
        while (u-- > 0) {
            result[u] = v;
            v = p[v];
        }
        return result;
    }

    // 合并配置对象
    var rendererOptions = extend({ patchProp: patchProp }, nodeOps);
    var renderer;
    function ensureRenderer() {
        return renderer || (renderer = createRenderer(rendererOptions));
    }
    var render = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // ensureRenderer() 返回的是个 renderer 实例，我们要调用它的 render 方法
        (_a = ensureRenderer()).render.apply(_a, __spreadArray([], __read(args), false));
    };
    /**
     * 创建并生成 app 实例
     * @param args
     * @returns
     */
    var createApp = function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var app = (_a = ensureRenderer()).createApp.apply(_a, __spreadArray([], __read(args), false));
        // 获取挂载方法
        var mount = app.mount;
        app.mount = function (containerOrSelector) {
            var container = normalizeContainer(containerOrSelector);
            if (!container)
                return;
            mount(container);
        };
        return app;
    };
    function normalizeContainer(container) {
        if (isString(container)) {
            var res = document.querySelector(container);
            return res;
        }
        return container;
    }

    var _a;
    var CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
    var CREATE_VNODE = Symbol('createVNode');
    var TO_DISPLAY_STRING = Symbol('toDisplayString');
    var CREATE_COMMENT = Symbol('createCommentVNode');
    /**
     * const {xx} = Vue
     * 即：从 Vue 中可以被导出的方法，我们这里统一用 creaVNode
     */
    var helperNameMap = (_a = {},
        // 在 renderer 中通过 export { creatVNode as createElementVNode } 导出
        _a[CREATE_ELEMENT_VNODE] = 'createElementVNode',
        _a[CREATE_VNODE] = 'createVNode',
        _a[TO_DISPLAY_STRING] = 'toDisplayString',
        _a[CREATE_COMMENT] = 'createCommentVNode',
        _a);

    /**
     * 创建根节点
     * @param children 子节点
     * @returns 根节点
     */
    function createRoot(children) {
        return {
            type: 0 /* NodeTypes.ROOT */,
            children: children,
            // 位置信息，不影响渲染
            loc: {}
        };
    }
    function createVNodeCall(context, tag, props, children) {
        if (context) {
            context.helper(CREATE_ELEMENT_VNODE);
        }
        return {
            type: 13 /* NodeTypes.VNODE_CALL */,
            tag: tag,
            props: props,
            children: children
        };
    }
    function createCompoundExpression(children, loc) {
        return {
            type: 8 /* NodeTypes.COMPOUND_EXPRESSION */,
            children: children,
            loc: loc
        };
    }
    /**
     * 创建简单表达式节点
     * @param content 表达式内容
     * @param isStatic 是否静态
     * @returns 返回一个简单表达式节点
     */
    function createSimpleExpression(content, isStatic) {
        return {
            type: 4 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content,
            isStatic: isStatic,
            loc: {}
        };
    }
    /**
     * 创建对象属性节点
     * @param key 属性名
     * @param value 属性值
     * @returns 返回一个对象属性节点
     */
    var createObjectProperty = function (key, value) {
        return {
            type: 16 /* NodeTypes.JS_PROPERTY */,
            loc: {},
            key: isString(key) ? createSimpleExpression(key, true) : key,
            value: value
        };
    };
    /**
     * 创建条件表达式
     * @param test 条件
     * @param consequent 条件为真时的表达式
     * @param alternate 条件为假时的表达式
     * @param newline 是否换行
     * @returns 返回一个条件表达式
     */
    function createConditionalExpression(test, consequent, alternate, newline) {
        if (newline === void 0) { newline = true; }
        return {
            type: 19 /* NodeTypes.JS_CONDITIONAL_EXPRESSION */,
            test: test,
            consequent: consequent,
            alternate: alternate,
            newline: newline,
            loc: {}
        };
    }
    /**
     * 创建 JS 调用表达式的节点
     * @param callee 调用表达式
     * @param args 参数
     * @returns 返回一个 JS 调用表达式
     */
    function createCallExpression(callee, args) {
        return {
            type: 14 /* NodeTypes.JS_CALL_EXPRESSION */,
            loc: {},
            callee: callee,
            arguments: args
        };
    }

    /**
     * 基础的 parse 方法，生成 AST
     */
    function baseParse(content) {
        // 创建 parser 对象，为解析器的上下文（template 模板）
        var context = createParserContext(content);
        var children = parseChildren(context, []);
        console.log(context, children);
        return createRoot(children);
    }
    function createParserContext(content) {
        return {
            source: content
        };
    }
    /**
     * 处理子节点
     */
    function parseChildren(context, ancestors) {
        console.log(context, ancestors);
        // 存放所有 node 节点的数组
        var nodes = [];
        // 循环解析所有 node 节点
        while (!isEnd(context, ancestors)) {
            var s = context.source;
            var node = void 0;
            if (startsWith(s, '{{')) {
                node = parseInterpolation(context);
                console.log('node:', node);
            }
            else if (s[0] === '<') {
                // 解析开始标签
                if (/[a-z]/i.test(s[1])) {
                    // 解析开始标签
                    node = parseElement(context, ancestors);
                }
            }
            // 若以上两个 if 没进入，则我们可以认为它是文本节点
            if (!node) {
                node = parseText(context);
            }
            pushNode(nodes, node);
        }
        return nodes;
    }
    /**
     * 判断 source 是否以 searchString 开头
     * @param source 源字符串
     * @param searchString 搜索字符串
     * @returns 是否以 searchString 开头
     */
    function startsWith(source, searchString) {
        return source.startsWith(searchString);
    }
    /**
     * 判断是否结束
     */
    function isEnd(context, ancestors) {
        var s = context.source;
        if (startsWith(s, '</')) {
            for (var i = ancestors.length - 1; i >= 0; i--) {
                var tag = ancestors[i].tag;
                if (startsWithEndTagOpen(s, tag)) {
                    return true;
                }
            }
        }
        return !s;
    }
    /**
     * 判断 source 是否以 </tag 开头
     */
    function startsWithEndTagOpen(source, tag) {
        return (startsWith(source, '</') &&
            source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
            /[\t\r\n\f />]/.test(source[2 + tag.length] || '>'));
    }
    /**
     * 将 node 节点推入 nodes 数组
     */
    function pushNode(nodes, node) {
        nodes.push(node);
    }
    /**
     * 解析元素
     * @param context 上下文
     * @param ancestors 栈
     * @returns 元素
     */
    function parseElement(context, ancestors) {
        // 先处理标签
        var element = parseTag(context, 0 /* TagType.Start */);
        // 处理子节点
        ancestors.push(element);
        // 触发 parseChildren 方法，解析子节点
        var children = parseChildren(context, ancestors);
        ancestors.pop();
        // 将子节点赋值给元素
        element['children'] = children;
        // 处理结束标签
        if (startsWithEndTagOpen(context.source, element.tag)) {
            parseTag(context, 1 /* TagType.End */);
        }
        return element;
    }
    // 解析标签
    function parseTag(context, type) {
        // 解析开始标签
        var match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
        // 获取标签名
        var tag = match[1];
        // 对模版进行解析处理
        advanceBy(context, match[0].length);
        // 属性与指令处理 如：v-if
        advanceSpaces(context);
        var props = parseAttributes(context, type);
        // 处理结束标签部分
        // 判断是否为自闭和标签
        var isSelfClosing = startsWith(context.source, '/>');
        advanceBy(context, isSelfClosing ? 2 : 1);
        // 标签类型
        var tagType = 0 /* ElementTypes.ELEMENT */;
        return {
            type: 1 /* NodeTypes.ELEMENT */,
            tag: tag,
            tagType: tagType,
            props: props,
            // children: []
        };
    }
    /**
     * 截取 source 字符串, 多次调用，逐步处理 template 里的 token
     * @param context 上下文
     * @param numberOfCharacters 截取的长度
     */
    function advanceBy(context, numberOfCharacters) {
        var source = context.source;
        // 截取 source 字符串
        context.source = source.slice(numberOfCharacters);
    }
    /**
     * 解析文本
     * @param context 上下文
     * @returns 文本
     */
    function parseText(context) {
        // 定义普通文本的结束标记
        var endTokens = ['<', '{{'];
        var endIndex = context.source.length;
        // 精准计算 endIndex，从 context.source 中找到 < 或 {{ 的下标索引，取最小值为 endIndex
        for (var i = 0; i < endTokens.length; i++) {
            var index = context.source.indexOf(endTokens[i]);
            if (index !== -1 && endIndex > index) {
                endIndex = index;
            }
        }
        // 获取处理的文本内容
        var content = parseTextData(context, endIndex);
        return {
            type: 2 /* NodeTypes.TEXT */,
            content: content
        };
    }
    /**
     * 从指定位置截取文本数据
     * @param context 上下文
     * @param length 截取的长度
     * @returns 截取的文本内容
     */
    function parseTextData(context, length) {
        // 获取指定文本数据
        var rawText = context.source.slice(0, length);
        // 截取后，更新 context.source
        advanceBy(context, length);
        return rawText;
    }
    /**
     * 解析插值表达式 {{xxx}}
     * @param context 上下文
     * @returns 插值
     */
    function parseInterpolation(context) {
        // open = {{  close = }}
        var _a = __read(['{{', '}}'], 2), open = _a[0], close = _a[1];
        advanceBy(context, open.length);
        // 获取差值表达式的中间值
        var closeIndex = context.source.indexOf(close, open.length);
        var preTrimContent = parseTextData(context, closeIndex);
        var content = preTrimContent.trim();
        advanceBy(context, close.length);
        return {
            type: 5 /* NodeTypes.INTERPOLATION */,
            content: {
                type: 4 /* NodeTypes.SIMPLE_EXPRESSION */,
                isStatic: false,
                content: content
            }
        };
    }
    /**
     * 处理 div v-if 之间的空格
     * @param context 上下文
     */
    function advanceSpaces(context) {
        var match = /^[\t\r\n\f ]+/.exec(context.source);
        if (match) {
            advanceBy(context, match[0].length);
        }
    }
    /**
     * 解析属性与指令
     * @param context 上下文
     * @param type 标签类型
     * @returns 属性与指令
     */
    function parseAttributes(context, type) {
        // 解析后的 props 数组
        var props = [];
        // 属性名数组
        var attributeNames = new Set();
        // 循环解析，直到解析道标签结束 ('>' || '/>')
        while (context.source.length > 0 &&
            !startsWith(context.source, '>') &&
            !startsWith(context.source, '/>')) {
            var attr = parseAttribute(context, attributeNames);
            if (type === 0 /* TagType.Start */) {
                // 将属性名添加到属性名数组中
                props.push(attr);
            }
            advanceSpaces(context);
        }
        return props;
    }
    /**
     * 解析属性与指令
     * @param context 上下文
     * @param nameSet 属性名集合
     * @returns 属性与指令
     */
    function parseAttribute(context, nameSet) {
        // 解析属性名
        var match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
        var name = match[0];
        // 将属性名添加到属性名集合中
        nameSet.add(name);
        // 截取属性名后的内容
        advanceBy(context, name.length);
        // 解析属性值
        var value = undefined;
        // 解析模版 获取对应属性节点的值
        if (/^[\t\r\n\f ]*=/.test(context.source)) {
            advanceSpaces(context);
            // 截取属性值
            advanceBy(context, 1);
            advanceSpaces(context);
            // 解析属性值
            value = parseAttributeValue(context);
        }
        // 针对 v- 指令的处理
        if (/^(v-[A-Za-z0-9-]|:|\.|@|#)/.test(name)) {
            var match_1 = /(?:^v-([a-z0-9-]+))?(?:(?::|^\.|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name);
            // 获取指令名称 v-if 则获取 if
            var dirName = match_1[1];
            // 获取指令参数 v-if="xxx" 则获取 xxx
            // let arg: any
            // 获取指令修饰符 v-if:xxx 则获取 xxx
            // let modifiers = match[3] ? match[3].slice(1).split('.') : []
            return {
                type: 7 /* NodeTypes.DIRECTIVE */,
                name: dirName,
                arg: undefined,
                modifiers: undefined,
                exp: value && {
                    type: 4 /* NodeTypes.SIMPLE_EXPRESSION */,
                    content: value.content,
                    isStatic: false,
                    loc: value.loc
                },
                loc: {}
            };
        }
        return {
            type: 6 /* NodeTypes.ATTRIBUTE */,
            name: name,
            value: value && {
                type: 2 /* NodeTypes.TEXT */,
                content: value.content,
                loc: value.loc
            },
            loc: {}
        };
    }
    function parseAttributeValue(context) {
        var content = '';
        // 判断是单引号还是双引号
        var quote = context.source[0];
        var isQuoted = quote === "\"" || quote === "'";
        if (isQuoted) {
            // 截取属性值
            advanceBy(context, 1);
            // 获取结束的 index
            var endIndex = context.source.indexOf(quote);
            // 如果存在结束的 index，则截取属性值 如：v-if="xxx" 则截取 xxx
            if (endIndex !== -1) {
                content = parseTextData(context, endIndex);
                // 截取属性值
                advanceBy(context, 1);
            }
            else {
                content = parseTextData(context, context.source.length);
            }
        }
        return {
            content: content,
            isQuoted: isQuoted,
            loc: {}
        };
    }

    /**
     * 单个元素的根节点
     */
    function isSingleElementRoot(root, child) {
        var children = root.children;
        return children.length === 1 && child.type === 1 /* NodeTypes.ELEMENT */;
    }

    function isText(node) {
        return node.type === 2 /* NodeTypes.TEXT */ || node.type === 5 /* NodeTypes.INTERPOLATION */;
    }
    /**
     * 获取 VNode 生成函数
     * @param ssr 是否是 SSR
     * @param isComponent 是否是组件
     * @returns
     */
    function getVNodeHelper(ssr, isComponent) {
        // 类型一致：如果 helpers 用的是 Symbol，查找时也要用 Symbol，不能用字符串。
        // 比如：helper(CREATE_ELEMENT_VNODE)，而不是 helper("CREATE_ELEMENT_VNODE")。
        return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE;
    }
    /**
     * 判断是否为 v-slot
     */
    function isVSlot(node) {
        return node.type === 7 /* NodeTypes.DIRECTIVE */ && node.name === "slot";
    }
    /**
     * 返回 node 节点
     * @param node
     * @returns
     */
    function getMemoedVNodeCall(node) {
        return node;
    }
    /**
     * 注入属性 填充 props
     * @param node
     * @param prop
     */
    function injectProp(node, prop) {
        var propsWithInjection;
        var props = node.type === 13 /* NodeTypes.VNODE_CALL */ ? node.props : node.arguments[2];
        if (props == null || isString(props)) {
            propsWithInjection = createObjectExpression([prop]);
        }
        if (node.type === 13 /* NodeTypes.VNODE_CALL */) {
            node.props = propsWithInjection;
        }
    }
    /**
     * 创建对象表达式节点
     * @param properties 属性
     * @returns 返回一个对象表达式节点
     */
    function createObjectExpression(properties) {
        return {
            type: 15 /* NodeTypes.JS_OBJECT_EXPRESSION */,
            loc: {},
            properties: properties
        };
    }

    function transform(root, options) {
        // 创建 transform 上下文
        var context = createTransformContext(root, options);
        // 按照深度优先依次处理 node 节点转化
        traverseNode(root, context);
        // 根节点处理
        createRootCodegen(root);
        root.helpers = __spreadArray([], __read(context.helpers.keys()), false);
        root.components = [];
        root.directives = [];
        root.imports = [];
        root.exports = [];
        root.hoists = [];
        root.temps = [];
        root.cached = [];
    }
    /**
     * 创建 transform 上下文
     */
    function createTransformContext(root, _a) {
        var _b = _a.nodeTransforms, nodeTransforms = _b === void 0 ? [] : _b;
        var context = {
            // options
            root: root,
            helpers: new Map(),
            currentNode: root,
            parent: null,
            childIndex: 0,
            // state
            nodeTransforms: nodeTransforms,
            // methods
            helper: function (name) {
                var count = context.helpers.get(name) || 0;
                context.helpers.set(name, count + 1);
                return name;
            },
            replaceNode: function (node) {
                context.parent.children[context.childIndex] = context.currentNode = node;
            }
        };
        return context;
    }
    function createRootCodegen(root) {
        var children = root.children;
        // 仅支持一个根节点处理
        if (children.length === 1) {
            var child = children[0];
            if (isSingleElementRoot(root, child) && child.codegenNode) {
                var codegenNode = child.codegenNode;
                root.codegenNode = codegenNode;
            }
        }
    }
    /**
     * 遍历转化节点，转换过程中一定要有深度优先（即：孙 -> 子 -> 父），因为当前节点的状体往往需要根据子节点的情况确定
     * 转化过程分为两个阶段：
     * 1、进入阶段：存储所有节点的转化函数到 exitFns 中
     * 2、退出阶段：执行 exitFns 中缓存的函数，一定是倒叙的，保证处理过程时深度优先
     */
    function traverseNode(node, context) {
        // 通过上下文记录当前正在处理的 node 节点
        context.currentNode = node;
        // 获取当前所有 node 节点的 transform 函数
        var nodeTransforms = context.nodeTransforms;
        // 存储转化函数的数组
        var exitFns = [];
        // 遍历 nodeTransforms 数组，将每个转化函数添加到 exitFns 中
        for (var i_1 = 0; i_1 < nodeTransforms.length; i_1++) {
            var onExit = nodeTransforms[i_1](node, context);
            if (onExit) {
                // 如果 onExit 是数组，则将数组中的每个元素添加到 exitFns 中
                if (isArray(onExit)) {
                    exitFns.push.apply(exitFns, __spreadArray([], __read(onExit), false));
                }
                else {
                    exitFns.push(onExit);
                }
            }
            // 因为触发了 replaceNode 方法，可能导致 context.currentNode 发生改变，所以需要在这里校正
            if (!context.currentNode) {
                return;
            }
            else {
                // 节点更换
                node = context.currentNode;
            }
        }
        // 继续转化子节点
        switch (node.type) {
            case 10 /* NodeTypes.IF_BRANCH */:
            case 1 /* NodeTypes.ELEMENT */:
            case 0 /* NodeTypes.ROOT */:
                traverseChildren(node, context);
                break;
            case 5 /* NodeTypes.INTERPOLATION */: // {{xxx}} 差值表达式
                context.helper(TO_DISPLAY_STRING);
                break;
            // v-if 指令
            case 9 /* NodeTypes.IF */:
                // 处理 v-if 指令
                for (var i_2 = 0; i_2 < node.branches.length; i_2++) {
                    var branch = node.branches[i_2];
                    traverseNode(branch, context);
                }
                break;
        }
        // 退出阶段
        context.currentNode = node;
        var i = exitFns.length;
        while (i--) {
            exitFns[i]();
        }
    }
    /**
     * 循环处理子节点
     * @param node
     * @param context
     */
    function traverseChildren(parent, context) {
        var children = parent.children;
        if (children) {
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                context.parent = parent;
                context.childIndex = i;
                traverseNode(child, context);
            }
        }
    }
    /**
     * 创建结构化指令转换函数
     * @param name 指令名称或正则表达式
     * @param fn 转换函数
     * @returns 返回一个转换函数，该函数用于处理节点上的结构化指令
     */
    function createStructuralDirectiveTransform(name, fn) {
        // s 参数指的是指令名称（directive name）例如：当解析 <div v-if="condition"> 时，s 就是 "if"； 若 name 是字符串，则直接比较，若 name 是正则，则使用正则匹配
        var matches = isString(name) ? function (s) { return s === name; } : function (s) { return name.test(s); };
        return function (node, context) {
            if (node.type === 1 /* NodeTypes.ELEMENT */) {
                var props = node.props;
                // 结构转化与 v-slot 无关，所以需要过滤掉 v-slot 指令
                if (node.tagType === 3 /* ElementTypes.TEMPLATE */ && props.some(isVSlot)) {
                    return;
                }
                // 存储转化函数的数组
                var exitFns = [];
                for (var i = 0; i < props.length; i++) {
                    var prop = props[i];
                    if (prop.type === 7 /* NodeTypes.DIRECTIVE */ && matches(prop.name)) {
                        // 移除指令，避免无限递归
                        props.splice(i, 1);
                        i--;
                        var onExit = fn(node, context, prop, i);
                        if (onExit) {
                            exitFns.push(onExit);
                        }
                    }
                }
                // 返回 exitFns 数组，数组中存储的是转化函数的返回值，这些返回值是转化函数的退出函数
                return exitFns;
            }
        };
    }

    /**
     * 元素转换
     */
    function transformElement(node, context) {
        return function postTransformElement() {
            node = context.currentNode;
            // 只处理元素节点
            if (node.type !== 1 /* NodeTypes.ELEMENT */) {
                return;
            }
            var tag = node.tag;
            var vnodeTag = "\"".concat(tag, "\"");
            var vnodeProps = [];
            var vnodeChildren = node.children;
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }

    /**
     * 将相邻的文本节点和表达式合并为一个表达式
     *
     * 例如：
     * <div>hello{{name}}</div>
     * 上述模版包含两个节点：
     * 1、文本节点：hello
     * 2、INTERPOLATION 表达式节点：{{name}}
     * 这两个节点生成 render 函数时，需要被合并：'hello' + _toDisplayString(_ctx.msg)
     * 那么在合并时就要多出来 + 符号
     * 例如：
     * children: [
     *  { TEXT 文本节点 },
     *  " + ",
     *  { type: NodeTypes.INTERPOLATION }
     * ]
     */
    function transformText(node, context) {
        if (node.type === 0 /* NodeTypes.ROOT */ ||
            node.type === 1 /* NodeTypes.ELEMENT */ ||
            node.type === 10 /* NodeTypes.IF_BRANCH */ ||
            node.type === 11 /* NodeTypes.FOR */) {
            return function () {
                // 获取所有子节点
                var children = node.children;
                // 当前容器
                var currentContainer;
                // 遍历所有子节点
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    if (isText(child)) {
                        // j = i + 1 表示从当前节点的下一个节点开始遍历
                        for (var j = i + 1; j < children.length; j++) {
                            var next = children[j];
                            if (isText(next)) {
                                if (!currentContainer) {
                                    currentContainer = children[i] = createCompoundExpression([child], child.loc);
                                    // 在当前节点 child 和下一个节点 next 之间插入 + 符号
                                    currentContainer.children.push(' + ', next);
                                    // 删除下一个节点
                                    children.splice(j, 1);
                                    j--;
                                }
                                else {
                                    currentContainer = undefined;
                                    break;
                                }
                            }
                        }
                    }
                }
            };
        }
    }

    var aliasHelper = function (s) { return "".concat(helperNameMap[s], ": _").concat(helperNameMap[s]); };
    /**
     * 将 JavaScript 代码生成 render 函数
     * @param ast
     */
    function generate(ast) {
        // 创建代码生成上下文
        var context = createCodegenContext(ast);
        // 获取 code 的拼接方法
        var push = context.push, indent = context.indent, deindent = context.deindent, newline = context.newline;
        // 生成函数的前置代码
        genFunctionPreamble(context);
        // 生成函数名称和参数
        var functionName = 'render';
        var args = ['_ctx', '_cache'];
        var signature = args.join(', ');
        // 利用函数名称和参数生成函数体
        push("function ".concat(functionName, "(").concat(signature, ") {"));
        // 缩进 + 换行
        indent();
        // 增加 with 触发
        push('with(_ctx) {');
        indent();
        var hasHelpers = ast.helpers.length > 0;
        if (hasHelpers) {
            push("const { ".concat(ast.helpers.map(aliasHelper).join(', '), " } = _Vue"));
            push('\n');
            newline();
        }
        // 最后拼接 return 语句
        newline();
        push("return ");
        // 处理 return 结果 如：return _createElementVNode("div", [], ["hello"])
        if (ast.codegenNode) {
            genNode(ast.codegenNode, context);
        }
        else {
            push("null");
        }
        // with 结尾 +反缩进 + 换行
        deindent();
        push('}');
        indent();
        push('}');
        console.log(context.code);
        return {
            ast: ast,
            code: context.code,
        };
    }
    /**
     * 区分节点处理
     * @param node 节点
     * @param context 代码生成上下文
     */
    function genNode(node, context) {
        switch (node.type) {
            case 1 /* NodeTypes.ELEMENT */:
            case 9 /* NodeTypes.IF */:
                // 处理子节点
                genNode(node.codegenNode, context);
                break;
            case 2 /* NodeTypes.TEXT */:
                genText(node, context);
                break;
            case 13 /* NodeTypes.VNODE_CALL */:
                genVNodeCall(node, context);
                break;
            // 复合表达式处理
            case 4 /* NodeTypes.SIMPLE_EXPRESSION */:
                genExpression(node, context);
                break;
            // 表示处理
            case 5 /* NodeTypes.INTERPOLATION */:
                genInterpolation(node, context);
                break;
            // {{}} 处理
            case 8 /* NodeTypes.COMPOUND_EXPRESSION */:
                genCompoundExpression(node, context);
                break;
            case 14 /* NodeTypes.JS_CALL_EXPRESSION */:
                genCallExpression(node, context);
                break;
            case 19 /* NodeTypes.JS_CONDITIONAL_EXPRESSION */:
                genConditionalExpression(node, context);
                break;
        }
    }
    /**
     * 处理文本节点
     * @param node 文本节点
     * @param context 代码生成上下文
     */
    function genText(node, context) {
        context.push(JSON.stringify(node.content), node);
    }
    /**
     * 处理 VNode_CALL 节点
     * @param node VNode_CALL 节点
     * @param context 代码生成上下文
     */
    function genVNodeCall(node, context) {
        var push = context.push, helper = context.helper;
        var tag = node.tag, props = node.props, children = node.children, patchFlag = node.patchFlag, dynamicProps = node.dynamicProps, isComponent = node.isComponent;
        // 返回 vnode 生成函数
        var callHelper = getVNodeHelper(context.inSSR, isComponent);
        // console.log(helper(CREATE_ELEMENT_VNODE));
        push(helper(callHelper) + '(', node);
        // 获取函数参数
        var args = genNullableArgs([tag, props, children, patchFlag, dynamicProps]);
        // 参数填充
        genNodeList(args, context);
        push(')');
    }
    /**
     * 处理 createXXXVNode 函数参数
     * @param args 参数
     * @returns 可空参数
     */
    function genNullableArgs(args) {
        var i = args.length;
        while (i--) {
            if (args[i] !== null) {
                break;
            }
        }
        return args.slice(0, i + 1).map(function (a) { return a || 'null'; });
    }
    /**
     * 创建代码生成上下文
     * @param ast 抽象语法树
     */
    function createCodegenContext(ast) {
        var context = {
            // render 函数代码字符串
            code: '',
            // 运行时全局变量名
            runtimeGlobalName: 'Vue',
            // 模版源
            source: ast.loc.source,
            // 缩进级别
            indentLevel: 0,
            // 需要触发的方法，关联 JavaScript AST 的属性 helpers
            helper: function (key) {
                return "_".concat(helperNameMap[key]);
            },
            // 插入代码
            push: function (code) {
                context.code += code;
            },
            // 换行
            newline: function () {
                newline(context.indentLevel);
            },
            // 缩进 + 换行
            indent: function () {
                newline(++context.indentLevel);
            },
            // 反缩进 + 换行
            deindent: function () {
                newline(--context.indentLevel);
            },
        };
        function newline(n) {
            context.code += '\n' + ' '.repeat(n);
        }
        return context;
    }
    /**
     * 生成函数前置代码
     * @param context
     */
    function genFunctionPreamble(context) {
        var push = context.push, newline = context.newline, runtimeGlobalName = context.runtimeGlobalName;
        var VueBinding = runtimeGlobalName;
        push("const _Vue = ".concat(VueBinding, "\n"));
        newline();
        push("return ");
    }
    /**
     * 处理参数填充
     * @param nodes 节点列表
     * @param context 代码生成上下文
     */
    function genNodeList(nodes, context) {
        var push = context.push; context.newline;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            // 字符串直接拼接
            if (isString(node)) {
                push(node);
            }
            else if (isArray(node)) {
                // 数组需要 push "[" 和 "]"
                genNodeListAsArray(node, context);
            }
            else {
                // 对象需要区分 node 节点类型，递归处理
                genNode(node, context);
            }
            if (i < nodes.length - 1) {
                push(', ');
            }
        }
    }
    function genNodeListAsArray(nodes, context) {
        context.push('[');
        genNodeList(nodes, context);
        context.push(']');
    }
    function genCompoundExpression(node, context) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (isString(child)) {
                context.push(child);
            }
            else {
                genNode(child, context);
            }
        }
    }
    function genInterpolation(node, context) {
        var push = context.push, helper = context.helper;
        push("".concat(helper(TO_DISPLAY_STRING), "("));
        genNode(node.content, context);
        push(')');
    }
    function genExpression(node, context) {
        var content = node.content, isStatic = node.isStatic;
        context.push(isStatic ? JSON.stringify(content) : content, node);
    }
    /**
     * JS 调用表达式处理
     * @param node JS_CALL_EXPRESSION 节点
     * @param context 代码生成上下文
     */
    function genCallExpression(node, context) {
        var push = context.push, helper = context.helper;
        var callee = isString(node.callee) ? node.callee : helper(node.callee);
        push(callee + '(', node);
        genNodeList(node.arguments, context);
        push(')');
    }
    function genConditionalExpression(node, context) {
        var test = node.test, consequent = node.consequent, alternate = node.alternate, needNewline = node.newline;
        var push = context.push, indent = context.indent, deindent = context.deindent, newline = context.newline;
        if (test.type === 4 /* NodeTypes.SIMPLE_EXPRESSION */) {
            // 写入变量
            genExpression(test, context);
        }
        // 换行
        needNewline && indent();
        // 缩进 ++
        context.indentLevel++;
        // 写入空格
        needNewline || push(' ');
        // 写入
        push('? ');
        // 写入满足条件的处理逻辑
        genNode(consequent, context);
        // 反缩进 --
        context.indentLevel--;
        // 换行
        needNewline && newline();
        // 写入空格
        needNewline || push(' ');
        // 写入
        push(': ');
        // 判断 else 的类型是否为 JS_CONDITIONAL_EXPRESSION
        var isNested = alternate.type === 19 /* NodeTypes.JS_CONDITIONAL_EXPRESSION */;
        // 不是则缩进 ++
        if (!isNested) {
            context.indentLevel++;
        }
        // 写入 else 的逻辑
        genNode(alternate, context);
        // 反缩进 --
        if (!isNested) {
            context.indentLevel--;
        }
        //  控制缩进 + 换行
        needNewline && deindent();
    }

    /**
     * 处理 v-if 指令
     * @param node 当前节点
     * @param context 上下文
     * @param dir 指令
     * @returns 返回一个转换函数，该函数用于处理节点上的结构化指令
     */
    var transformIf = createStructuralDirectiveTransform(/^(if|else|else-if)$/, function (node, context, dir) {
        return processIf(node, context, dir, function (ifNode, branch, isRoot) {
            // TODO 目前无需处理兄弟节点情况
            var key = 0;
            return function () {
                if (isRoot) {
                    ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context);
                }
            };
        });
    });
    /**
     * 处理 v-if 指令
     * @param node 当前节点
     * @param context 上下文
     * @param dir 指令
     * @param processCodegen 处理 codegenNode 的函数
     */
    function processIf(node, context, dir, processCodegen) {
        if (dir.name === "if") {
            var branch = createIfBranch(node, dir);
            // 生成 if 指令节点
            var ifNode = {
                type: 9 /* NodeTypes.IF */,
                loc: node.loc,
                branches: [branch],
            };
            // 切换 currentNode 为 ifNode
            context.replaceNode(ifNode);
            // 处理 codegenNode
            if (processCodegen) {
                return processCodegen(ifNode, branch, true);
            }
        }
    }
    /**
     * 创建 if 指令的 branch 分支
     * @param node 当前节点
     * @param dir 指令
     * @returns 返回一个 if 分支节点
     */
    function createIfBranch(node, dir) {
        return {
            type: 10 /* NodeTypes.IF_BRANCH */,
            loc: node.loc,
            condition: dir.exp,
            children: [node],
        };
    }
    /**
     * 创建 codegenNode 节点
     * @param branch 分支
     * @param keyIndex 键索引
     * @param context 上下文
     * @returns 返回一个 codegenNode 节点
     */
    function createCodegenNodeForBranch(branch, keyIndex, context) {
        if (branch.condition) {
            return createConditionalExpression(branch.condition, createChildrenCodegenNode(branch, keyIndex), 
            // 以注释的形式展示 v-if
            createCallExpression(context.helper(CREATE_COMMENT), ['"v-if"', 'true']));
        }
        else {
            return createChildrenCodegenNode(branch, keyIndex);
        }
    }
    /**
     * 创建指定子节点 codegenNode 节点
     * @param branch 分支
     * @param keyIndex 键索引
     * @returns 返回一个子节点 codegenNode 节点
     */
    function createChildrenCodegenNode(branch, keyIndex) {
        var keyProperty = createObjectProperty("key", createSimpleExpression("".concat(keyIndex), false));
        var children = branch.children;
        var firstChild = children[0];
        var ret = firstChild.codegenNode;
        var vnodeCall = getMemoedVNodeCall(ret);
        // 填充 props
        injectProp(vnodeCall, keyProperty);
        return ret;
    }

    function baseCompile(template, options) {
        if (options === void 0) { options = {}; }
        var ast = baseParse(template);
        transform(ast, extend(options, {
            nodeTransforms: [
                transformElement,
                transformText,
                transformIf
            ]
        }));
        console.log(JSON.stringify(ast));
        return generate(ast);
    }

    function compile(template, options) {
        return baseCompile(template, options);
    }

    function compileToFunction(template, options) {
        var code = compile(template, options).code;
        var render = new Function(code)();
        console.log(render);
        return render;
    }
    registerRuntimeCompiler(compileToFunction);

    exports.Comment = Comment$1;
    exports.EMPTY_ARR = EMPTY_ARR;
    exports.EMPTY_OBJ = EMPTY_OBJ;
    exports.Fragment = Fragment;
    exports.Text = Text$1;
    exports.compile = compileToFunction;
    exports.computed = computed;
    exports.createApp = createApp;
    exports.createCommentVNode = createCommentVNode;
    exports.createElementVNode = createVNode;
    exports.effect = effect;
    exports.extend = extend;
    exports.h = h;
    exports.hasChanged = hasChanged;
    exports.isArray = isArray;
    exports.isFunction = isFunction;
    exports.isObject = isObject;
    exports.isOn = isOn;
    exports.isSameVNodeType = isSameVNodeType;
    exports.isString = isString;
    exports.queuePreFlushCb = queuePreFlushCb;
    exports.reactive = reactive;
    exports.ref = ref;
    exports.render = render;
    exports.toDisplayString = toDisplayString;
    exports.watch = watch;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
