const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const types = require("@babel/core").types
const generate = require("@babel/generator").default
const fs = require('fs')


const jsFile = fs.readFileSync('./demo6/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

const visitor = {
  VariableDeclarator (path) {
    const binding = path.scope.getBinding(path.node.id.name);

        // 如标识符被修改过，则不能进行删除动作。
        if (!binding || binding.constantViolations.length > 0) {
            return;
        }

        // 未被引用
        if (!binding.referenced) {
            path.remove();
        }
  }
}


traverse(ast, visitor)

const result = generate(ast)
console.log(result.code)

// console.log(ast)
console.log('end');

