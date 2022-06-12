const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const generate = require("@babel/generator").default
const types = require("@babel/core").types

const fs = require('fs')


const jsFile = fs.readFileSync('./demo5/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

const visitor = {
  'StringLiteral|NumericLiteral'(path) {
      // 以下方法均可
      // path.node.extra.raw = path.node.rawValue
      // path.node.extra.raw = '"' + path.node.value + '"'
      // delete path.node.extra
    if (path.node.extra) {
      const raw = path.node.extra.raw
      // const next = path.get('node')
      if (/\\u|\\x\w{2,4}/.test(path.node.extra.raw)) {
        path.addComment('trailing', raw, true); // 增加一个原值注释
      }
      delete path.node.extra.raw
    }
  }
}

let deFunction;
/**
   * 根据函数调用次数寻找到解密函数
   */
 function findDecFunction() {
  let decFunctionArr = [];
  let index = 0; // 定义解密函数所在语句下标

  // 先遍历所有函数(作用域在Program)，并根据引用次数来判断是否为解密函数
  traverse(ast, {
    Program(p) {
      p.traverse({
        // 函数声明，变量声明 (函数声明，函数表达式)
        'FunctionDeclaration|VariableDeclarator'(path) {
          if (!(types.isFunctionDeclaration(path.node) || types.isFunctionExpression(path.node.init))) {
            return;
          }

          let name = path.node.id.name;
          let binding = path.scope.getBinding(name);
          if (!binding) return;

          // 调用超过100次多半就是解密函数,具体可根据实际情况来判断
          if (binding.referencePaths.length > 100) {
            decFunctionArr.push(name);

            // 根据最后一个解密函数来定义解密函数所在语句下标
            let binding = p.scope.getBinding(name);
            if (!binding) return;

            let parent = binding.path.findParent((_p) => _p.isFunctionDeclaration() || _p.isVariableDeclaration());
            if (!parent) return;
            let body = p.scope.block.body;
            for (let i = 0; i < body.length; i++) {
              const node = body[i];
              if (node.start == parent.node.start) {
                index = i + 1;
                break;
              }
            }
            // 遍历完当前节点,就不再往子节点遍历
            path.skip();
          }
        },
      });
    },
  });

  let newAst = parse('');
  // 插入解密函数前的几条语句
  newAst.program.body = ast.program.body.slice(0, index);
  // 把这部分的代码转为字符串，由于可能存在格式化检测，需要指定选项，来压缩代码
  let code = generate(newAst, { compact: true }).code;
  // 将字符串形式的代码执行，这样就可以在 nodejs 中运行解密函数了
  global.eval(code);
 
  deFunction = decFunctionArr;
}




findDecFunction()

traverse(ast, {
  VariableDeclarator(path) {
    // 当变量名与解密函数名相同
    if (path.node.id.name == deFunction[0]) {
      let binding = path.scope.getBinding(deFunction[0]);
      // 通过referencePaths可以获取所有引用的地方
      binding &&
        binding.referencePaths.map((p) => {
          // 判断父节点是调用表达式，且参数为两个
          if (p.parentPath.isCallExpression()) {
            // 输出参数与解密后的结果
            let args = p.parentPath.node.arguments.map((a) => a.value).join(' ');
            const fn = p.parentPath.toString()
            let str = eval(fn);
            console.log(args, str);
            p.parentPath.replaceWith(types.stringLiteral(str));
          }
        });
    }
  },
});
traverse(ast, visitor)

const result = generate(ast)
console.log(result.code)
fs.writeFileSync('./demo5/result.js', result.code)
// console.log(ast)
console.log('end');

