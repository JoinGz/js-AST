# AST混淆还原
## 思路
主要还是借助traverse在各个节点的遍历能力。我们就能对对应的节点做出处理。
如何知道节点呢？在[AST-EXPLORER](https://astexplorer.net/)中查看对应的type。

### 一些经验

#### a.b 和 a['b']取值的差异
```js
// path.node.property.name 当时用.时 如 a.b
// path.node.property.value 当使用a['b']时，还要判断是不是字符串标识符
   const property = path.node.property.name ?? path.node.property.value

```
#### unicode和16进制数怎么还原
    删除节点中的extra属性即可
```js
    delete path.node.extra.raw
```
#### 平坦化的逻辑
     平坦化的实现其实就是在while循环前面加了一个数组，数组中值的顺序就是执行顺序，拿到数组中的值，然后取出case体，按照数组中的值的顺序还原即可。
#### 解密函数的还原
     找到解密函数的位置，目前通过的调用次数来寻找，因为还原的次数比较多。找到位置后把其前面的声明（解密函数的依赖）和他自己一起取出来放到vm中执行。每次遇到加密函数调用的地方就调用vm中的解密函数，用返回值替换掉当前的path即可。
#### 对象取值的还原
如:
```js
var a = {
    b: '1'
}

var c = {
    e: a.b
}
// 处理为

var c = {
    e: '1'
}

```
在声明的时候就把键值对按照作用域分类储存在一个对象里。（多层对象就判断如果还是对象就一直往后找）
然后遍历所有的成员取值表达式，如这里的 a.b 
取出a,在刚刚的对象里找到a所存的值，然后取出a.b的值替换掉当前的path即可。
#### 函数执行的还原
     先判断是不是一个可以还原的函数，如果只有一行语句且直接return的我们就认为是还原函数。
因为对象取值的还原已经存储的所有的对象的键值对。所以函数的值也在其中。
拿到执行的函数，找到是第几个参数是调用参数
exp: function a(b, c){return b(c)} // b就是调用参数
因为是在调用中判断，所有有真实的参数，然后生成一个节点。节点的内容就是之前函数定义的返回内容如上面的b(c)，直接用实参生成一个b(c)即可。
 