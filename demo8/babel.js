const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const types = require("@babel/core").types
const generate = require("@babel/generator").default
const fs = require('fs')
const vm = require('vm')

const jsFile = fs.readFileSync('./demo8/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

let decodeFunName;
const contexts = {
  atob: function (_0xde0de6) {
    var _0x2a7919 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var _0x3aff67 = String(_0xde0de6).replace(/=+$/, "");
    for (var _0x2498af = 0x0, _0x1c61ef, _0x1b7110, _0x49a06d = 0x0, _0x4b2521 = ""; _0x1b7110 = _0x3aff67.charAt(_0x49a06d++); ~_0x1b7110 && (_0x1c61ef = _0x2498af % 0x4 ? _0x1c61ef * 0x40 + _0x1b7110 : _0x1b7110, _0x2498af++ % 0x4) ? _0x4b2521 += String.fromCharCode(0xff & _0x1c61ef >> (-0x2 * _0x2498af & 0x6)) : 0x0) {
      _0x1b7110 = _0x2a7919.indexOf(_0x1b7110);
    }
    // console.log(`正确输出：${_0x4b2521}`)
    return _0x4b2521;
  }
};

/**
 * 找到解密函数
 * 根据函数的调用次数来判断是否是解密函数，一般解密函数的调用次数比较多
 * 找到这个函数后，把他前面的声明，全部放在vm中执行，相当于有个这个函数的执行环境
 * 遇到这个函数，就调用执行，用结果替换当前的解密函数
 *
 */

const visitor = {
  'FunctionDeclaration|VariableDeclarator' (path) {
    // 函数声明和函数表达式的判断不同
    if (types.isFunctionDeclaration(path.node) || types.isFunctionExpression(path.node.init)) {
      const funName = path.node.id.name
      const scopeInfo = path.scope.getBinding(funName)
      // console.log(`当前的函数：${funName}`)
      if (scopeInfo.references > 500) {
        console.log('解密函数为：' + funName)
        decodeFunName = funName
        const decodeFunPath = scopeInfo.path
  
        const decodeFunFather = decodeFunPath.parentPath // 直接拿到father
  
        const decodeFunPeer = decodeFunFather.container // 拿到所有同级

        // 找到加密函数前的数据

        let index;
        for (let i = 0; i < decodeFunPeer.length; i++) {
          const node = decodeFunPeer[i]
          // 此处是函数声明，decodeFunPath是函数体，decodeFunPath.parent 是前面的 var
          if (node.start === decodeFunPath.parent.start) {
            index = i
          }
        }

        console.log(index)

        path.stop()

        const newASTData = parse('')

        newASTData.program.body = decodeFunPeer.slice(0, index + 1)

        let script = generate(newASTData, {minified: true}).code

        
        script = new vm.Script(script);
        
        script.runInNewContext(contexts);
        
        console.log(contexts);
  
      }
    }
  }
}


traverse(ast, visitor)

traverse(ast, {
  // 找到函数调用的地方
  CallExpression (path) {
    const fnName = path.node?.callee?.name
    const argsResult = []
    if (decodeFunName && fnName === decodeFunName) {
      const arguments = path.node.arguments
      for (let i = 0; i < arguments.length; i++) {
        const arg = arguments[i];
        // argsResult.push(arg.extra?.raw || arg.value) 之前取的extra?.raw发现不对，js在执行的时候应该也是value，相当于unicode和16进制转换后的结果
        argsResult.push(arg.value)
      }
      try {
        let resultText = contexts[decodeFunName](...argsResult)
        path.replaceWith(types.stringLiteral(resultText))
      } catch (error) {
        console.log(`error`, error)
      }
    }
  }
})



/**
 * 替换对象和函数
 * 如 var a = {
 *  b: 'c',
 *  d: function (e,f){
 *    return e(f)
 *  }
 * }
 * console.log(a['b']);console.log(a.d(()=>{},1))
 * 在对象声明时，把它的node存起来（我这里根据父元素的不同，做了不同的作用域区分）
 * 然后在调用的时候直接取对应的node返回
 */

  const allObjMap = new WeakMap()
  
function getPropertyList (node, path) {
    // 如: var yy = {zz: 'pp'}; var m = {z: yy}; var jj = {ll: m.z.zz};
    // 把m.z.zz 放到数组中['zz','z','m']
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
    return getLastNode(propertyList, path, node, 0)
  }
  
  function getLastNode(propertyList, path, node, index) {
    const fatherPath = path.scope.getBinding(propertyList[index])?.path.parentPath.parentPath
    const savedObj = allObjMap.get(fatherPath);
    if (savedObj) {
      const obj = savedObj[propertyList[index]][propertyList[index+1]]
      if (!obj) return node;
      if (types.isIdentifier(obj, { type: 'Identifier' })) {
        // 替换一下真实的对象名称
        // 如上面的 m.z 其实是 yy对象，因为yy才是保存的对象。
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
          return node1
        } else {
          return findRealValue(node1, path)
        }
    }
  } else {
    return node
  }
}
const visitor2 = {
  'VariableDeclaration' (path) {
    // console.log(path.toString())
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
traverse(ast, visitor2)

// 替换从已保存的对象上取值
traverse(ast, {
  // 成员表达式节点
  "MemberExpression" (path) {
    // console.log(path.toString())
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
        // if (types.isNumericLiteral(node) || types.isStringLiteral(node)) {
        if (types.isLiteral(node)) {
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
    // console.log(path.toString())
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
            const argument = node.body.body[0].argument
            if (types.isBinaryExpression(argument)) {
              const newNode = types.binaryExpression(argument.operator, path.node.arguments[0], path.node.arguments[1])
              path.replaceWith(newNode)
            }
            if (types.isLogicalExpression(argument)) {
              const newNode = types.logicalExpression(argument.operator, path.node.arguments[0], path.node.arguments[1])
              path.replaceWith(newNode)
            }
            if (types.isCallExpression(argument)) {
              // 找到调用者位置
              let fnName = argument.callee.name
              if (types.isMemberExpression(argument.callee)) {
                fnName = argument.callee.object.name
              }
              const index = node.params.findIndex(item => item.name === fnName)
              if (index === -1) {
                console.log(`有未适配的情况`)
                return
              };
              const id = path.node.arguments[index]
              path.node.arguments.splice(index, 1)
              let newFn;
              try {
                 newFn = types.callExpression(id, path.node.arguments,)
              } catch (error) {
                console.log(error)
              }
              path.replaceWith(newFn)
              
            }
          }
        }
      }
    }

  }
})



  // 扁平化
;traverse(ast, {
  WhileStatement (path) {
      // switch 节点
    let switchNode = path.node?.body?.body;
    if (!switchNode) {
      return
    }
    switchNode = switchNode[0]
    if (!types.isSwitchStatement(switchNode)) return
      // switch 语句内的控制流数组名，本例中是 _0x34e16a
      let arrayName = switchNode.discriminant.object.name;
      // 获得所有 while 前面的兄弟节点，本例中获取到的是声明两个变量的节点，即 const _0x34e16a 和 let _0x2eff02
      let prevSiblings = path.getAllPrevSiblings();
      // 定义缓存控制流数组
      let array = []
      // forEach 方法遍历所有节点
      prevSiblings.forEach(pervNode => {
          let { id, init } = pervNode.node.declarations[0];
          // 如果节点 id.name 与 switch 语句内的控制流数组名相同
          if (arrayName === id.name) {
              // 获取节点整个表达式的参数、分割方法、分隔符
              let object = init.callee.object.value;
              let property = init.callee.property.value;
              let argument = init.arguments[0].value;
              // 模拟执行 '3,4,0,5,1,2'['split'](',') 语句
              array = object[property](argument)
              // 也可以直接取参数进行分割，方法不通用，比如分隔符换成 | 就不行了
              // array = init.callee.object.value.split(',');
          }
          // 前面的兄弟节点就可以删除了
          pervNode.remove();
      });

      // 储存正确顺序的控制流语句
      let replace = [];
      // 遍历控制流数组，按正确顺序取 case 内容
      array.forEach(index => {
          let consequent = switchNode.cases[index].consequent;
          // 如果最后一个节点是 continue 语句，则删除 ContinueStatement 节点
          if (types.isContinueStatement(consequent[consequent.length - 1])) {
              consequent.pop();
          }
          // concat 方法拼接多个数组，即正确顺序的 case 内容
          replace = replace.concat(consequent);
      }
      );
      // 替换整个 while 节点，两种方法都可以
      path.replaceWithMultiple(replace);
      // path.replaceInline(replace);
  }

})
// 删除未使用的变量 -- 一下未生效，如果重载入ast

// {
//   const visitor = {
//     VariableDeclarator (path) {
//       const binding = path.scope.getBinding(path.node.id.name);
  
//           // 如标识符被修改过，则不能进行删除动作。
//           if (!binding || binding.constantViolations.length > 0) {
//               return;
//           }
  
//           // 未被引用
//           if (!binding.referenced) {
//               path.remove();
//           }
//     }
//   }
  
  
//   traverse(ast, visitor)
// }

const result = generate(ast)
// console.log(result.code)
fs.writeFileSync('./demo8/result.js', result.code)

// console.log(ast)
console.log('end');

