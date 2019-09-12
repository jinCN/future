# [@superjs](https://www.npmjs.com/org/superjs)/future
wrap an async result. 

## Example

```javascript
/// client.js
const MongoClient = require('mongodb').MongoClient
module.exports = future(()=>require('mongodb').MongoClient.connect('mongodb://localhost:27017'))
```

```javascript
/// collection.js
const client = require('./client')
module.exports = client.db().collection('test')
```

```javascript
/// app.js
const collection=require('./collection')
module.exports = async (params)=>{
  let result = await collection.insert(params)
  return result
}
```

## Thought
如果想在同步环境中返回需要 async 初始化的对象(如 export 一个 axios client 或 db client), 你可以选择:
1. 返回两个元素: async init函数, obj, 这样消费者需要提防init是否漏掉执行
2. 返回一个元素: async init函数, 该函数返回 obj, 这样消费者必须在 async 函数中才可消费, 对 reexport 或仅透传参数的场景很不友好
3. 返回一个元素: obj=future(init), 其返回为同步的, 该 obj 及该 obj 所有同步执行的过程和结果, 在被 await/then/catch/finally 时, 正确的结果将会被返回, 如同 obj=await init()之后执行这些过程一样

解释: 假如 await init() 返回 realObj, 那么 obj 是一个被称为 realObj 的配料的 Proxy, 除了实际 inspect 值时拿不到有用信息, 它能进行 realObj 的所有操作, 且get属性及当做函数调用时返回结果为新配料 obj2, 最终某个配料被 realObjN=await objN, 那么结果已经去配料化了, realObjN是实际对象

## Limitation
1. 仅对配料的get set apply作了 trap, 也就是不要进行get set apply之外的操作

## Options
future 支持一个有用的选项: lazy(默认 true)

当 lazy 为 false 时, 会在 future 函数进入时就执行 init 函数

否则会在首次 await 某个配料时执行 init 函数, 有可能永不被执行, 起到优化作用

若想指定 lazy 为 false, 使用示例如下:
```javascript
/// client.js
module.exports = future(()=>require('mongodb').MongoClient.connect('mongodb://localhost:27017'),{lazy:false})
```
