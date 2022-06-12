const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const types = require("@babel/core").types
const generate = require("@babel/generator").default
const fs = require('fs')


const jsFile = fs.readFileSync('./demo2/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

const visitor = {
  // BinaryExpression  二进制表达式 如 1+2 ; a === a
  // CallExpression 调用表达式 ru console.log(1)
  // ConditionalExpression 条件表达式 如 a ? 1 : 2
  "BinaryExpression|CallExpression|ConditionalExpression"(path) {
      const {confident, value} = path.evaluate()
      if (confident){
          path.replaceInline(types.valueToNode(value))
      }
  }
}


traverse(ast, visitor)
// {jsescOption:{"minimal":true}} 把中文unicode还原成中文
const result = generate(ast, {jsescOption:{"minimal":true}})
console.log(result.code)

// console.log(ast)
console.log('end');

