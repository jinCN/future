module.exports = future

function future (init, { lazy = true } = {}) {
  let initPromise
  if (!lazy) initPromise = init()
  let opTree = {
    parent: null
  }
  let opQueue = []

  return stubCallable()

  function travelOps (initValue) {
    let opQueue1 = opQueue
    opQueue = []
    opTree.value = initValue
    for (let node of opQueue1) {
      if (node.hasOwnProperty('value')) continue
      let { parent, action } = node
      let [method, ...args] = action
      node.value = Reflect[method](parent.value, ...args)
      node.parent = null
    }
  }

  function stubCallable (parent = opTree) {
    return new Proxy(function () {}, {

      apply (target, thisArg, argArray) {
        let node = {
          parent,
          action: ['apply', thisArg, argArray]
        }
        opQueue.push(node)

        return stubCallable(node)
      },
      set (target, p, value, receiver) {
        let node = {
          parent,
          action: ['set', p, value]
        }
        opQueue.push(node)

        return stubCallable(node)
      },
      get (target, p, receiver) {
        if (p === 'then' || p === 'catch' || p === 'finally') {
          var then = function (onResolved, onRejected) {
            if (target._thenPromise) return target._thenPromise.then(onResolved, onRejected)
            initPromise = initPromise || init()
            return initPromise.then(initValue => {
              travelOps(initValue)
              // 此时已有promise类型的value
              target._thenPromise = Promise.resolve(parent.value)
              return target._thenPromise.then(onResolved, onRejected)
            })
          }
        }
        if (p === 'then') {
          return then
        } else if (p === 'catch') {
          return function (onRejected) { return then(null, onRejected) }
        } else if (p === 'finally') {
          return function (onFinally) {
            return then(v => {
              onFinally()
              return v
            }, e => {
              onFinally()
              throw e
            })
          }
        }
        let node = {
          parent,
          action: ['get', p]
        }
        opQueue.push(node)
        return stubCallable(node)
      }
    })
  }
}
