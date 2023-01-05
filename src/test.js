import * as babel from '@babel/core'
import * as babelParser from '@babel/parser'
import * as t from '@babel/types'

// console.log({babel, babelParser})
const sourceContent = `
const funcA = aa => aa;
const hasPermission = (aa, bb) => aa;
hasPermission('中国', 'aaa');
hasPermission('测试[999]', 'bbb');
funcA('加油111')
funcA('加油[222]')
`

const INCLUDE_CHINESE_CHAR = /.*[\u4e00-\u9fa5]+.*$/
const ast = babelParser.parse(sourceContent, {
  sourceType: 'unambiguous',
  plugins: ['jsx', 'typescript']
})

const arr = []

  // const { entireFileDisabled, partialCommentList, nextLineCommentList, thisLineCommentList } =
  //   collectDisableRuleCommentlocation(ast.comments)

  // const _inDisableRuleCommentlocation = (startLine: number, endLine: number) => {
  //   return inDisableRuleCommentlocation(
  //     entireFileDisabled,
  //     partialCommentList,
  //     nextLineCommentList,
  //     thisLineCommentList,
  //     startLine,
  //     endLine
  //   )
  // }

  const visitor = {
    Program: {
      enter(path) {
        path.traverse({
          'StringLiteral|TemplateLiteral|JSXText'(path) {
            const startLine = path.node.loc.start.line
            const endLine = path.node.loc.end.line
            console.log({startLine, endLine, path: ''})
            // if (_inDisableRuleCommentlocation(startLine, endLine)) {
            //   path.node.skipTransform = true
            // }
            if (
              path.findParent((p) => {
                return p.node.callee && t.isIdentifier(p.node.callee.object, { name: 'console' })
              })
            ) {
              path.node.skipTransform = true
            }
          }
        })
      }
    },
    StringLiteral(path) {
      if (path.node.skipTransform) {
        return
      }
      if (path.parent.type === 'CallExpression') {
      	console.log(path.parent.callee)
      }
      const functionCall = path.parent.type === 'CallExpression' // 是否为函数调用
      const value = path.node.value
      console.log(`StringLiteral: ${value}`)
      if (INCLUDE_CHINESE_CHAR.test(value)) {
      	// 如果为hasPermission参数则去除词条末尾[xxx]部分,eg: 测试[999] => 测试 
      	if (functionCall && path.parent.callee.name === 'hasPermission') {
      		arr.push(value.replace(/\[.+\]$/, ''))
      	} else {
        	arr.push(value)
      	}
      }
    },
    TemplateLiteral(path) {
      if (path.node.skipTransform) {
        return
      }
      path.get('quasis').forEach((templateElementPath) => {
        const value = templateElementPath.node.value.raw
        if (value && INCLUDE_CHINESE_CHAR.test(value)) {
          arr.push(value)
        }
      })
    },
    JSXText(path) {
      if (path.node.skipTransform) {
        return
      }
      const value = path.node.value

      if (INCLUDE_CHINESE_CHAR.test(value)) {
        arr.push(value)
      }
    }
  }

  const i18nPlugin = { visitor }

  babel.transformFromAstSync(ast, sourceContent, {
    presets: null,
    plugins: [[i18nPlugin]]
  })

  console.log(arr)