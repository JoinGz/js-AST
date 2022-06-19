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

function getPropertyList (node, path) {
  const result = []
  const lastProperty = node.property.name
  result.push(lastProperty)
  if (types.isMemberExpression(node.object)) {
    return result.concat(getPropertyList(node.object))
  } else {
    result.push(node.object.name)
    return result
  }
}

function getFinallyObj (node, path) {
  let propertyList = getPropertyList(node, path)
  propertyList.reverse()
  const firstPropertList = propertyList[0]
  return getLastNode(propertyList, path, node, 0)
  for (let i = 0; i < propertyList.length; i++) {
    const property = propertyList[i];
    const fatherPath = path.scope.getBinding(property)?.path.parentPath.parentPath
    const savedObj = allObjMap.get(fatherPath);
    if (savedObj) {
      return getLastNode(node, path)
    }
  }
}

function getLastNode(propertyList, path, node, index) {
  const fatherPath = path.scope.getBinding(propertyList[index])?.path.parentPath.parentPath
  const savedObj = allObjMap.get(fatherPath);
  if (savedObj) {
    const obj = savedObj[propertyList[index]][propertyList[index+1]]
    if (!obj) return node;
    if (types.isIdentifier(obj, { type: 'Identifier' })) {
      propertyList.splice(index + 1, 1, obj.name)
      return getLastNode(propertyList, path, node, index+1)
    }
    return obj
  } else {
    return node
  }
}

function findRealValue (node, path) {
  if (types.isMemberExpression(node)) {

    if (types.isMemberExpression(node.object)) {
      return getFinallyObj(node, path)
    }

    const objName = node.object.name
    const property = node.property.name ?? node.property.value
    const fatherPath = path.scope.getBinding(objName)?.path.parentPath.parentPath
    const savedObj = allObjMap.get(fatherPath);
    if (savedObj) {
      const node1 = savedObj?.[objName]?.[property];
        if (types.isLiteral(node1)) {
          // console.log(obj, property, 'yes')
          // console.log(path.toString())
          // path.replaceWith(types.valueToNode(node1.value))
          // path.replaceWith(node1)
          return node1
        } else {
          return findRealValue(node1, path)
        }
    }
  } else {
    return node
  }
}

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
          hasSavedObj[node.key.name ?? node.key.value] = findRealValue(node.value, path)
        }
        

        // fatherSavedObj[path.node.declarations[0].id.name] = {
          
        // }

        allObjMap.set(fatherPath, fatherSavedObj)

      } else {
        console.warn(`暂未匹配的类型`)
      }
    
    
  }
}






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
        const objName = path.node.callee.object.name
        const property = path.node.callee.property.name ?? path.node.callee.property.value
  
        const fatherPath = path.scope.getBinding(objName)?.path.parentPath.parentPath
        const savedObj = allObjMap.get(fatherPath);
        if (savedObj) {
          const node = savedObj?.[objName]?.[property];
          if (types.isFunctionExpression(node) && types.isReturnStatement(node.body.body[0])) {
            if (types.isBinaryExpression(node.body.body[0].argument)) {
              const newNode = types.binaryExpression(node.body.body[0].argument.operator, path.node.arguments[0], path.node.arguments[1])
              path.replaceWith(newNode)
            }
            if (types.isCallExpression(node.body.body[0].argument)) {
              // 找到调用者位置
              const fnName = node.body.body[0].argument.callee.name
              const index = node.params.findIndex(item => item.name === fnName)
              const id = path.node.arguments[index]
              path.node.arguments.splice(index, 1)
              const newFn = types.callExpression(id, path.node.arguments,)
              path.replaceWith(newFn)
              
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

