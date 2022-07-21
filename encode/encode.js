const { types } = require('@babel/core')

const parse = require('@babel/core').parse
const traverse = require('@babel/core').traverse
const generate = require('@babel/generator').default
const fs = require('fs')

const base64 = {
  encode(str) {
    return Buffer.from(str).toString('base64')
  },
  decode(str, type = 'utf8') {
    return Buffer.from(str, 'base64').toString(type)
  },
}

const jsFile = fs.readFileSync('./encode/demo.js', { encoding: 'utf-8' })

const ast = parse(jsFile)

const visitor = {
  MemberExpression(path) {
    if (types.isIdentifier(path.node.property)) {
      let name = path.node.property.name
      path.node.property = types.stringLiteral(name)
    }
    path.node.computed = true
  },
  'ClassProperty|ClassMethod'(path) {
    if (types.isIdentifier(path.node.key)) {
      let name = path.node.key.name
      if (name === 'constructor') return
      path.node.key = types.stringLiteral(name)
    }
    path.node.computed = true
  },
}

traverse(ast, visitor)

{
  // 数值常量加密
  traverse(ast, {
    // 如 var num = 100; 处理后 var num = 508333 ^ 508361;
    NumericLiteral(path) {
      let value = path.node.value
      let key = parseInt(Math.random() * (999999 - 100000) + 100000 + '', 10)
      let cipher = value ^ key
      path.replaceWith(
        types.binaryExpression(
          '^',
          types.numericLiteral(cipher),
          types.numericLiteral(key)
        )
      )
      path.skip() // 因为内部也有numericLiteral 就会导致死循环
    },
  })
}

{
  // 字符串加密
  let strArr = []
  let literalName = 'gz_text_arr'
  traverse(ast, {
    StringLiteral(path) {
      const encryptText = base64.encode(path.node.value)
      let index = strArr.indexOf(encryptText)
      if (index === -1) {
        strArr.push(encryptText)
        index = strArr.length - 1
      }
      const enctyptNode = types.memberExpression(
        types.identifier(literalName),
        types.numericLiteral(index),
        true
      )
      path.replaceWith(
        types.callExpression(types.identifier('atob'), [enctyptNode])
      )
    },
  })

  /**
   * 构建数组声明语句，并加入到ast最开始处
   */
  const t = types
  strArr = strArr.map((v) => t.stringLiteral(v))
  let varDeclarator = t.variableDeclarator(
    t.identifier(literalName),
    t.arrayExpression(strArr)
  )
  strArr = t.variableDeclaration('const', [varDeclarator])
  ast.program.body.unshift(strArr)
}

{
  function generatorIdentifier(decNum) {
    let arr = ['O', 'o', '0']
    let retval = []
    while (decNum > 0) {
      retval.push(decNum % arr.length)
      decNum = parseInt(decNum / arr.length)
    }

    let Identifier = retval
      .reverse()
      .map((v) => arr[v])
      .join('')
    if (Identifier.length < 6) {
      Identifier = Identifier.padStart(6, 'OOOOOO')
    } else {
      Identifier[0] == '0' && (Identifier = 'O' + Identifier)
    }

    return Identifier
  }

  function renameOwnBinding(path) {
    let OwnBindingObj = {},
      globalBindingObj = {},
      i = 0
    path.traverse({
      Identifier(p) {
        let name = p.node.name
        let binding = p.scope.getOwnBinding(name)
        binding && generate(binding.scope.block).code == path.toString()
          ? (OwnBindingObj[name] = binding)
          : (globalBindingObj[name] = 1)
      },
    })
    for (let oldName in OwnBindingObj) {
      do {
        var newName = generatorIdentifier(i++)
      } while (globalBindingObj[newName])
      OwnBindingObj[oldName].scope.rename(oldName, newName)
    }
  }
  traverse(ast, {
    'Program|FunctionExpression|FunctionDeclaration|ClassDeclaration|ClassProperty|ClassMethod'(
      path
    ) {
      renameOwnBinding(path)
    },
  })
}

{
  const t = types;
  traverse(ast, {
    FunctionExpression(path) {
      let blockStatement = path.node.body
      let Statements = blockStatement.body.map(function (v) {
        if (t.isReturnStatement(v)) return v
        if (!(v.trailingComments && v.trailingComments[0].value == 'ASCIIEncrypt')) return v
        delete v.trailingComments
        let code = generate(v).code
        let codeAscii = [].map.call(code, function (v) {
          return t.numericLiteral(v.charCodeAt(0))
        })
        let decryptFuncName = t.memberExpression(t.identifier('String'), t.identifier('fromCharCode'))
        let decryptFunc = t.callExpression(decryptFuncName, codeAscii)
        return t.expressionStatement(t.callExpression(t.identifier('eval'), [decryptFunc]))
      })
      path.get('body').replaceWith(t.blockStatement(Statements))
    },
  })
}

const result = generate(ast)

fs.writeFileSync('./encode/result.js', result.code)
// console.log(ast)
console.log('end')
