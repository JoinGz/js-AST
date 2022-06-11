const parse = require("@babel/core").parse;
const traverse = require("@babel/core").traverse
const types = require("@babel/core").types
const generate = require("@babel/generator").default
const fs = require('fs')


const jsFile = fs.readFileSync('./demo3/demo.js', {encoding:'utf-8'})

const ast = parse(jsFile)

const visitor = {
    enter (path) {
    // 当前是一个 判断语句（IfStatement）  且 是布尔字面量或者数字字面量类型
    if (path.node.type === 'IfStatement' && (types.isBooleanLiteral(path.node.test) || types.isNumericLiteral(path.node.test) || types.isBinaryExpression(path.node.test))) {
        // 如果值为false

        if (types.isBinaryExpression(path.node.test)) {
            // 暂时中断。因为无法拿到path的下一个path。拿到执行evaluate就可以得到正确的返回值了
            console.log(path)
            const nextPath = path.get('test');
            // const nextPath = path.find((path) => path.isBinaryExpression());
            // const nextPath = path.getNextSibling().getNextSibling()
            const {confident, value} = nextPath.evaluate()
            if (confident && value){
                // path.replaceInline(types.valueToNode(value))
            path.replaceInline(path.node.consequent.body);

            }
            return 
        }

        if (path.node.test.value) {
            // 用后推的内容替换掉当前内容 
            path.replaceInline(path.node.consequent.body);
        } else {
            // 值为true时 且有为true的内容时
            if (path.node.alternate) {
                // 直接用true后面的块替换掉到当前
                path.replaceInline(path.node.alternate.body);
            } else {
                path.remove()
            }
        }
    }
}


}


// traverse(ast, {
//     // BinaryExpression  二进制表达式 如 1+2 ; a === a
//     // CallExpression 调用表达式 ru console.log(1)
//     // ConditionalExpression 条件表达式 如 a ? 1 : 2
//     "BinaryExpression|CallExpression|ConditionalExpression"(path) {
//         const {confident, value} = path.evaluate()
//         if (confident){
//             path.replaceInline(types.valueToNode(value))
//         }
//     }
//   })
traverse(ast, visitor)

const result = generate(ast)
console.log(result.code)

// console.log(ast)
console.log('end');

