const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const types = require("@babel/core").types
const generate = require("@babel/generator").default
const fs = require('fs')


const jsFile = fs.readFileSync('./demo7-self/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

const visitor = {
  'FunctionDeclaration|VariableDeclarator' (path) {
    if (types.isFunctionDeclaration(path.node) || types.isFunctionExpression(path.node)) {
      const name = path.node.id.name
      console.log(name)
      if (name === 'gz_change_name') {
        // path.remove() // 删除函数
        // path.node.id.name = 'gz' // change name
        // 替换整个函数体
        // path.replaceWith(
        //   types.expressionStatement(types.stringLiteral("Is this the real life?"))
        // );
        // 替换body
        // const body = path.get('body')
        // const newBody = types.blockStatement(
        //   [
        //     types.expressionStatement(types.stringLiteral("Is this the real life?")),
        //     types.returnStatement(types.stringLiteral("gz")),
        //   ]
        // )
        // body.replaceWith(newBody)
        // 前后增加注释
        // path.addComment('leading','gz_need_deleted--begin', false)
        // path.addComment('trailing','gz_need_deleted--end', false)
        // 寻找父函数
        const fatherFunction = path.findParent((_p) => _p.isFunctionDeclaration() || _p.isVariableDeclaration());
        fatherFunction.addComment('leading','gz_need_deleted--begin-father', false)
      }
    }
  }
}


traverse(ast, visitor)

const result = generate(ast)
console.log(result.code)

// console.log(ast)
console.log('end');

