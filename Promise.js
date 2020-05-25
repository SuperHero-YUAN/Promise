/*
 * 1、里面有三个状态 等待态(默认) 成功态 失败态 一旦成功了就不能失败 反过来一旦失败了也不能成功
 * 2、promise的实例都拥有一个then方法 一个参数是成功的回调 另一个是失败的回调
 * 3、如果执行函数是发生了异常也会执行失败逻辑
 * 4、如果promise一旦成功就不能失败 反过来也是一样 (只有等待态的时候才能去更改状态)
 * 
 * 可以在浏览器端或者node.js端使用
 * 
 */

(function(global, factory) {
    'use strict'
    //引出环境判断 该插件能够支持什么环境 支持三大模块化标准  CommonJS环境  CMD、AMD环境  浏览器环境
    typeof exports === 'object' && typeof module !== 'undefined' ?
        module.exports = factory() :
        (typeof define === 'function' && define.amd ?
            define(factory) :
            global.Promise = factory())
    if (typeof exports === 'object' && typeof module !== 'undefined') { // 在node.js环境下
        console.log(`
    ===================
    |                 |
    |      YUAN       |
    |                 |
    ===================
    `)
    } else if (global !== undefined) { // 在浏览器环境下
        console.log('%c author %c YUAN ',
            'color:#fff;padding:2px;background:#2f4f4f;border-radius:4px 0 0 4px',
            'color:#fff;padding:2px;background:#409eff;border-radius:0 4px 4px 0')
    }
})(typeof window !== 'undefined' ? window : this, function() {
    'use strict'

    // 判断是否为Promise对象
    const isPromsie = value => {
        if (typeof value === 'object' && value !== null || typeof value === 'function') {
            if (typeof value.then === 'function') {
                return true
            }
        } else {
            return false
        }
    }

    // 宏变量
    // 因为所有的 promise 都遵循这个规范 规定：这里的这个写法应该兼容所有promise
    const resolvePromise = (promise2, x, resolve, reject) => {
        // 判断 x 的值 和 promise2 是不是同一个 如果是同一个 就不用再等待了 直接出错即可
        if (promise2 === x) {
            return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
        }
        // 判断数据类型 typeof constructor
        if (typeof x === 'object' && x !== null || typeof x === 'function') {
            let called // 内部测试的时候 会成功和失败都调用
            try {
                let then = x.then
                if (typeof then === 'function') { // 当前有then方法 姑且认为是一个promise对象
                    then.call(x, y => { // y可能还是一个promise 知道解析出来的结果是一个普通值
                            if (called) { // 防止多次调用成功和失败
                                return
                            }
                            called = true
                            resolvePromise(promise2, y, resolve, reject) // 采用promise的成功结果将值向下传递
                        }, r => {
                            if (called) {
                                return
                            }
                            called = true
                            reject(r) // 采用promise的失败结果向下传递
                        }) // 能保证不用再次取then的值
                } else {
                    // {then:1}
                    resolve(x) // 说明 x 是一个普通对象 直接成功即可
                }
            } catch (error) {
                if (called) {
                    return
                }
                called = true
                reject(error)
            }
        } else {
            // x是一个普通值
            resolve(x) // promise2 成功
        }
    }

    const FULLFILLED = 'fullfilled' // 成功
    const REJECRED = 'rejected' // 失败
    const PENDING = 'pending' // 等待

    class Promise {
        constructor(executor) {
            this.status = PENDING // 默认是pending状态
            this.value = undefined // 储存成功的原因
            this.reason = undefined // 储存失败的原因

            this.onResolvedCallback = [] // 成功的回调函数的数组
            this.onRejectedCallback = [] // 失败的回调函数的数组

            // 成功函数
            let resolve = (value) => {
                if (this.status === PENDING) {
                    this.value = value
                    this.status = FULLFILLED
                    this.onResolvedCallback.forEach(fn => fn())
                }
            }

            // 失败函数
            let reject = (reason) => {
                if (this.status === PENDING) {
                    this.reason = reason
                    this.status = REJECRED
                    this.onRejectedCallback.forEach(fn => fn())
                }
            }

            try {
                executor(resolve, reject) // 立即执行
            } catch (error) {
                reject(error) // 错误处理，需要直接走错误逻辑
            }

        }

        /**
         * @description Promise 原型对象的then()
         * 指定成功和失败的回调函数
         * @param {Function} onFulfilled 成功的回调函数
         * @param {Function} onRejected 失败的回调函数
         * @returns {Object} 返回一个新的Promise对象
         */
        then(onFulfilled, onRejected) {
            // 指定默认的成功的回调(实现错误/异常传透的关键点)
            onFulfilled = typeof onFulfilled === 'function' ?
                onFulfilled :
                value => value // 向后传递成功的 value
            onRejected = typeof onRejected === 'function' ?
                onRejected :
                reason => { throw reason } // 向后传递失败的 reason

            let promise2 = new Promise((resolve, reject) => { // executor 函数立即执行
                // 同步
                if (this.status === FULLFILLED) {
                    setTimeout(() => { // 宏任务 异步处理成功的回调函数
                        try {
                            let x = onFulfilled(this.value)

                            // x可能是普通值 也可能是promise
                            // 判断 x 的值 => promise2 的状态
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (error) {
                            reject(error)
                        }
                    }, 0)
                }
                if (this.status === REJECRED) {
                    setTimeout(() => { // 宏任务 异步处理失败的回调函数
                        try {
                            let x = onRejected(this.reason)

                            // x可能是普通值 也可能是promise
                            // 判断 x 的值 => promise2 的状态
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (error) {
                            reject(error)
                        }
                    }, 0)
                }
                // 异步
                if (this.status === PENDING) {
                    // 如果是异步 先订阅
                    this.onResolvedCallback.push(() => { // 重写push方法
                        setTimeout(() => {
                            try {
                                let x = onFulfilled(this.value)

                                // x可能是普通值 也可能是promise
                                // 判断 x 的值 => promise2 的状态
                                resolvePromise(promise2, x, resolve, reject)
                            } catch (error) {
                                reject(error)
                            }
                        }, 0);
                    })
                    this.onRejectedCallback.push(() => {
                        setTimeout(() => {
                            try {
                                let x = onRejected(this.reason)

                                // x可能是普通值 也可能是promise
                                // 判断 x 的值 => promise2 的状态
                                resolvePromise(promise2, x, resolve, reject)
                            } catch (error) {
                                reject(error)
                            }
                        }, 0);
                    })
                }
            })

            return promise2
        }

        /**
         * @description Promise 原型对象的catch()
         * 指定失败的回调函数
         * @param {Function} onRejected 失败的回调函数
         * @returns {Object} 返回一个新的Promise对象
         */
        catch (onRejected) {
            return this.then(undefined, onRejected)
        }

        /**
         * @description  Promise 函数对象方法的 finally 方法
         * @returns 返回一个promise 会等待这个promise也执行完
         */
        finally(callback) {
            return this.then(
                value => {
                    // finally 传入的函数 无论成功还是失败都会执行
                    return Promise.resolve(callback()).then(() => value) // 如果成功 传到下一个成功里
                }, reason => {
                    return Promise.resolve(callback()).then(() => { throw reason }) // 如果失败 传到下一个失败里
                })
        }

        /**
         * @description Promise 函数对象方法的 resolve 方法
         * @returns 返回一个指定结果的成功的promise
         */
        static resolve(value) {
            // 返回一个成功/失败promise对象
            return new Promise((resolve, reject) => {
                if (value instanceof Promise) { // value 是 promise
                    // 使用value的结果作为promise的结果
                    value.then(resolve, reject)
                } else { // value 不是 promise
                    resolve(value)
                }
            })
        }

        /**
         * @description  Promise 函数对象方法的 reject 方法
         * @returns 返回一个指定reason的失败的promise
         */
        static reject(reason) {
            // 返回一个失败的promise
            return new Promise((resolve, reject) => {
                reject(reason);
            })
        }

        /**
         * @description Promise 函数对象方法的 all 方法
         * @returns 返回一个promise，只有当所有promise都成功时才成功，否则只要有一个失败就全部失败
         */
        static all(promises) {
            return new Promise((resolve, reject) => {
                let values = [] // 用来保存所有成功value的数组
                let index = 0 // 解决多个异步的并发问题 要使用计数器 用来保存成功promise的数量

                function processData(key, value) {
                    values[key] = value
                    if (++index == promises.length) {
                        resolve(values)
                    }
                }

                for (let i = 0; i < promises.length; i++) {
                    let current = promises[i]
                    if (isPromsie(current)) {
                        current.then(value => {
                            processData(i, value)
                        }, reject)
                    } else {
                        processData(i, current)
                    }
                }
            })
        }

        /**
         * @description  Promise 函数对象方法的 race 方法
         * @returns 返回一个promise，其结果由第一个完成的promise决定
         */
        static race(promises) {
            // 返回一个promise
            return new Promise((resolve, reject) => {
                // 遍历promises获取每个promise的结果
                promises.forEach((p, index) => {
                    Promise.resolve(p).then(
                        value => { // 一旦有成功了 将return变为成功
                            resolve(value)
                        },
                        reason => { // 一旦有失败了 将return变为失败
                            reject(reason)
                        }
                    )
                })
            })
        }

        // =============== 自定义静态方法 =====================

        /**
         * @description 返回一个promise对象，它在指定的事件后才返回成功/失败结果
         * @param {*} value
         * @param {*} time 指定延迟的时间
         */
        static resolveDelay(value, time) {
            // 返回一个成功/失败promise对象
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (value instanceof Promise) { // value 是 promise
                        // 使用value的结果作为promise的结果
                        value.then(resolve, reject)
                    } else { // value 不是 promise
                        resolve(value)
                    }
                }, time)
            })
        }

        /**
         * @description 返回一个promise对象，它在指定的事件后才返回失败结果
         * @param {*} value
         * @param {*} time 指定延迟的时间
         */
        static rejectDelay(reason, time) {
            // 返回一个失败的promise
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(reason);
                }, time)
            })
        }
    }

    // =============== 测试代码 Promise A+ 规范 =====================
    // 延迟对象
    Promise.defer = Promise.deferred = function() {
        let dfd = {}
        dfd.promise = new Promise((resolve, reject) => {
            dfd.resolve = resolve
            dfd.reject = reject
        })
        return dfd
    }

    // 将promise暴露出去
    return Promise
})