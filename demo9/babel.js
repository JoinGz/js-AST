const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const types = require("@babel/core").types
const generate = require("@babel/generator").default
const fs = require('fs')
const vm = require('vm')

const jsFile = fs.readFileSync('./demo9/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

let decodeFunName;
const contexts = {

};

/**
 * 思路在AST中找到对应的type。
 * 然后对对应的type进行处理
 */

const visitor = {
  'MemberExpression' (path) {
    console.log(path.toString())
    const {confident, value} = path.evaluate()
      if (confident){
          path.replaceInline(types.valueToNode(value))
      }
  }
}



const t = types;


traverse(ast, {
    VariableDeclarator(path) {
      var node = path.node
      if (!t.isObjectExpression(node.init)) return
      var objPropertiesList = node.init.properties
      if (objPropertiesList.length == 0) return
      var objName = node.id.name
      // 对定义的各个 方法 或 字符串 依次在作用域内查找是否有调用
      objPropertiesList.forEach((prop) => {
        var key = prop.key.value
        if (!t.isStringLiteral(prop.value)) {
          // 对方法属性的遍历
          if (!prop.value.body) {
            return
          }
          var retStmt = prop.value.body.body[0]

          // 该path的最近父节点
          var fnPath = path.getFunctionParent()

          fnPath && fnPath.traverse({
            CallExpression: function (_path) {
              if (!t.isMemberExpression(_path.node.callee)) return
              // 判断是否符合条件
              var _node = _path.node.callee
              if (!t.isIdentifier(_node.object) || _node.object.name !== objName) return
              if (!t.isStringLiteral(_node.property) || _node.property.value != key) return
              var args = _path.node.arguments
              // 二元运算

              if (t.isBinaryExpression(retStmt.argument) && args.length === 2) {
                _path.replaceWith(t.binaryExpression(retStmt.argument.operator, args[0], args[1]))
              } else if (t.isLogicalExpression(retStmt.argument) && args.length == 2) {
                // 逻辑运算
                _path.replaceWith(t.logicalExpression(retStmt.argument.operator, args[0], args[1]))
              } else if (t.isCallExpression(retStmt.argument) && t.isIdentifier(retStmt.argument.callee)) {
                // 函数调用
                _path.replaceWith(t.callExpression(args[0], args.slice(1)))
              }
            },
          })
        } else {
          // 对字符串属性的遍历
          var retStmt = prop.value.value // 该path的最近父节点
          var fnPath = path.getFunctionParent()
          fnPath && fnPath.traverse({
            MemberExpression: function (_path) {
              var _node = _path.node
              if (!t.isIdentifier(_node.object) || _node.object.name !== objName) return
              if (!t.isStringLiteral(_node.property) || _node.property.value != key) return
              _path.replaceWith(t.stringLiteral(retStmt))
            },
          })
        }
      })
      path.remove() // 遍历过的对象无用了，直接删除。
    },
  })



// traverse(ast, visitor)




const result = generate(ast)
// console.log(result.code)
fs.writeFileSync('./demo9/result.js', result.code)

// console.log(ast)
console.log('end');

