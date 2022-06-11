const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const generate = require("@babel/generator").default
const fs = require('fs')


const jsFile = fs.readFileSync('./demo1-string/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

const visitor = {
  'StringLiteral|NumericLiteral'(path) {
      // 以下方法均可
      // path.node.extra.raw = path.node.rawValue
      // path.node.extra.raw = '"' + path.node.value + '"'
      // delete path.node.extra
    const raw = path.node.extra.raw
    // const next = path.get('node')
    if (/\\u|\\x\w{2,4}/.test(path.node.extra.raw)) {
      path.addComment('trailing', raw, true); // 增加一个原值注释
    }
    delete path.node.extra.raw
  }
}

traverse(ast, visitor)
const result = generate(ast)
console.log(result.code)
fs.writeFileSync('./demo1-string/result.js', result.code)
// console.log(ast)
console.log('end');

