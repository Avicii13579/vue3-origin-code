var Vue = (function (exports) {
    'use strict';

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

    var isArray = Array.isArray;

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
        console.log(' track：收集依赖');
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
        console.log('trigger: 触发依赖');
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
        var e_1, _a;
        // 把 dep 构建成一个数组
        var effects = isArray(dep) ? dep : __spreadArray([], __read(dep), false);
        try {
            // 依次触发
            for (var effects_1 = __values(effects), effects_1_1 = effects_1.next(); !effects_1_1.done; effects_1_1 = effects_1.next()) {
                var effect_1 = effects_1_1.value;
                triggerEffect(effect_1);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (effects_1_1 && !effects_1_1.done && (_a = effects_1.return)) _a.call(effects_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    function triggerEffect(effect) {
        effect.run();
    }
    /**
     * effect 函数
     * @param fn
     * @returns 以 ReactiveEffect 实例为 this 的执行函数
     */
    function effect(fn) {
        // 实现 ReactiveEffect 实例
        var _effect = new ReactiveEffect(fn);
        // 执行 run 函数（默认 effect 调用里的 fn 会执行一次）
        _effect.run();
    }
    /**
     * 单例的 当前的 effect 拥有 run 函数能执行 fn 的 ReactiveEffect 的实例
     */
    var activeEffect;
    /**
     * 响应性触发依赖时的执行类
     */
    var ReactiveEffect = /** @class */ (function () {
        // 接收传入的回调函数 fn
        function ReactiveEffect(fn) {
            this.fn = fn;
        }
        ReactiveEffect.prototype.run = function () {
            // 为 activeEffect 复制
            activeEffect = this;
            // 执行 fn 函数
            return this.fn();
        };
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
        // 缓存代理对象
        proxyMap.set(target, proxy);
        return proxy;
    }

    exports.effect = effect;
    exports.reactive = reactive;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
