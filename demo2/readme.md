- 表达式还原

想要执行语句，我们需要了解 `path.evaluate()` 方法，该方法会对 `path` 对象进行执行操作，自动计算出结果，返回一个对象，其中的 `confident` 属性表示置信度，`value` 表示计算结果


使用 `types.valueToNode()` 方法创建节点
使用 `path.replaceInline()` 方法将节点替换成计算结果生成的新节点，替换方法有一下几种：

`replaceWith`：用一个节点替换另一个节点；
`replaceWithMultiple`：用多个节点替换另一个节点；
`replaceWithSourceString`：将传入的源码字符串解析成对应 Node 后再替换，性能较差，不建议使用；
`replaceInline`：用一个或多个节点替换另一个节点，相当于同时有了前两个函数的功能。

在表达式需要执行的时机（目前是3个，可以查阅看还有其他阶段没），执行`path.evaluate()` 方法。
拿到方法的返回值，然后生成一个新的节点来替换当前节点
