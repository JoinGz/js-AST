- 解密函数还原混淆的文字

`traverse`里增加一个处理函数即可

```js
const visitor = {
  StringLiteral(path) {
      // 以下方法均可
      // path.node.extra.raw = path.node.rawValue
      // path.node.extra.raw = '"' + path.node.value + '"'
      // delete path.node.extra
      delete path.node.extra.raw
  }
}

traverse(ast, visitor)
```

