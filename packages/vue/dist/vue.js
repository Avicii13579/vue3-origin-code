var Vue = (function (exports) {
    'use strict';

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
    // 只读空对象
    var EMPTY_OBJ = {};
    // 判断是否为 on 开头
    var onRE = /^on[^a-z]/;
    var isOn = function (key) { return onRE.test(key); };
    // 判断是否为同类型节点
    var isSameVNodeType = function (n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    };

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
        var vnode = instance.vnode, render = instance.render, data = instance.data;
        var result;
        try {
            // 按位与 思路：在 Vue 的虚拟 DOM 实现中，每个 vnode 都有一个 shapeFlag 属性，它是一个位掩码，用于标识该节点的类型和特性。
            // 当使用 & 操作符时，如果结果为非零值，表示该 vnode 确实具有 STATEFUL_COMPONENT 这个特性。
            if (vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
                // 修改 render 的 this，并获取返回值
                result = normalizeVNode(render.call(data));
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
                patchChildren(oldVNode, newVNode, container);
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
            patchChildren(oldVNode, newVNode, el);
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
                        // TODO 进行 diff 计算
                        patchKeyedChildren(c1, c2, container);
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
            // 3. common sequence + mount
            // (a b)
            // (a b) c 先执行 1.sync from start 在执行 3. common sequence + mount
            // 到3 时 i = 2, e1 = 1, e2 = 2
            // (a b)
            // c (a b) 先执行 2.sync from start 在执行 3. common sequence + mount
            // 到3 时 i = 0, e1 = -1, e2 = 0
        };
        return {
            render: render
        };
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

    exports.Comment = Comment$1;
    exports.Fragment = Fragment;
    exports.Text = Text$1;
    exports.computed = computed;
    exports.effect = effect;
    exports.h = h;
    exports.queuePreFlushCb = queuePreFlushCb;
    exports.reactive = reactive;
    exports.ref = ref;
    exports.render = render;
    exports.watch = watch;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
