const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const types = require("@babel/core").types
const generate = require("@babel/generator").default
const fs = require('fs')


const jsFile = fs.readFileSync('./demo4/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

const visitor = {
    WhileStatement (path) {
        // switch 节点
        let switchNode = path.node.body.body[0];
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

}


traverse(ast, {
    // BinaryExpression  二进制表达式 如 1+2 ; a === a
    // CallExpression 调用表达式 ru console.log(1)
    // ConditionalExpression 条件表达式 如 a ? 1 : 2
    "BinaryExpression|CallExpression|ConditionalExpression"(path) {
        const {confident, value} = path.evaluate()
        if (confident){
            path.replaceInline(types.valueToNode(value))
        }
    }
  })
traverse(ast, visitor)

const result = generate(ast)
console.log(result.code)

// console.log(ast)
console.log('end');

