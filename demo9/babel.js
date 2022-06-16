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

const allObjMap = new WeakMap()

const visitor = {
  'VariableDeclaration' (path) {
    console.log(path.toString())
    const fatherPath = path.parentPath
    const fatherSavedObj = allObjMap.get(fatherPath) ?? {}
    const hasSavedObj = fatherSavedObj[path.node.declarations[0].id.name] ?? (fatherSavedObj[path.node.declarations[0].id.name] = {})
    
      const declarationType = path.node.declarations[0].init
      if (types.isObjectExpression(declarationType)) {

        const properties = declarationType.properties

        for (let i = 0; i < properties.length; i++) {
          const node = properties[i];
          // StringLiteral 时从node.key.value上取值
          hasSavedObj[node.key.name ?? node.key.value] = node.value
        }
        

        // fatherSavedObj[path.node.declarations[0].id.name] = {
          
        // }

        allObjMap.set(fatherPath, fatherSavedObj)

      } else {
        console.warn(`暂未匹配的类型`)
      }
    
    
  }
}



const t = types;



// 保存声明的对象
traverse(ast, visitor)

// 替换从已保存的对象上取值
traverse(ast, {
  // 成员表达式节点
  "MemberExpression" (path) {
    console.log(path.toString())
    // const obj = 
    if (path.node.object && path.node.property) {
      const obj = path.node.object.name
      // path.node.property.name 当时用.时 如 a.b
      // path.node.property.value 当使用a['b']时，还要判断是不是字符串标识符
      const property = path.node.property.name ?? path.node.property.value
      const fatherPath = path.scope.getBinding(obj)?.path.parentPath.parentPath
      const savedObj = allObjMap.get(fatherPath);
      if (savedObj) {
        const node = savedObj?.[obj]?.[property];
        if (types.isNumericLiteral(node) || types.isStringLiteral(node)) {
          // console.log(obj, property, 'yes')
          // console.log(path.toString())
          // path.replaceWith(types.valueToNode(node.value))
          path.replaceWith(node)
        }
      }
    }
  }
})

// 替换函数

traverse(ast, {
  "CallExpression" (path) {
    console.log(path.toString())
    // 需要是成员表达式节点
    if (types.isMemberExpression(path.node.callee)) {
      // 需要是 标识符来调用（就是我们写 JS 时自定义的名称，如变量名，函数名，属性名，都归为标识符）
      // 还有其他调用如 [a()]()
      if (types.isIdentifier(path.node.callee.object)) {
        const obj = path.node.callee.object.name
        const property = path.node.callee.property.name ?? path.node.callee.property.value
  
        const fatherPath = path.scope.getBinding(obj)?.path.parentPath.parentPath
        const savedObj = allObjMap.get(fatherPath);
        if (savedObj) {
          const node = savedObj?.[obj]?.[property];
          if (types.isFunctionExpression(node) && types.isReturnStatement(node.body.body[0])) {
            if (types.isBinaryExpression(node.body.body[0].argument)) {
              const newNode = types.binaryExpression(node.body.body[0].argument.operator, path.node.arguments[0], path.node.arguments[1])
              path.replaceWith(newNode)
            }
          }
        }
      }
    }

  }
})

const result = generate(ast)
// console.log(result.code)
fs.writeFileSync('./demo9/result.js', result.code)

// console.log(ast)
console.log('end');

