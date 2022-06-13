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
 * 思路在AST中找到对应的type。
 * 然后对对应的type进行处理
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

// 找到可以执行的表达式 执行求了

// traverse(ast, {
//   CallExpression (path) {
//     if (types.isMemberExpression(path.node.callee)) {
//       const { confident, value } = path.evaluate()
//       if (confident) {
//         console.log(`把${path.toString()}处理了。value: ${value}`)
//         path.replaceWith(types.valueToNode(value))
//       }
//     }
//   }
// })



const result = generate(ast)
// console.log(result.code)
fs.writeFileSync('./demo8/result.js', result.code)

// console.log(ast)
console.log('end');

