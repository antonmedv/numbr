import test from 'ava'
import {lex} from './parser/lex'
import {parse} from './parser/parser'
import * as Nodes from './nodes'
import {Numbr, Percent, Result} from './results'

let cases: [string, Result][] = [
  ['1 + 2', new Numbr(3)],
  ['1 + - 2', new Numbr(-1)],
  ['1-2+3', new Numbr(2)],
  ['1+2*3', new Numbr(7)],
  ['0.05', new Numbr(0.05)],
  ['-+0', new Numbr(-0)],
  ['(1 - ', new Numbr(1)],
  ['1 * 2 %', new Numbr(2)],
  ['2x20', new Numbr(40)],
  ['100 + 5%', new Numbr(105)],
  ['100 - (5% + 5%)', new Numbr(90)],
  ['font-size: 20px;', new Numbr(20)],
  ['1 000 000', new Numbr(1000000)],
  ['1 usd in rub', new Numbr(2, 'RUB')],
  ['100 + 25% in rub', new Numbr(125, 'RUB')],
  ['100 рублей в долларах', new Numbr(50, 'USD')],
  ['100 in thb + 50% in income + 300', new Numbr(450, 'THB')],
  ['100 - 100 in rub + (3 usd in rub) / 3 in rub', new Numbr(2, 'RUB')],
  ['100 usd in rub + 300% / 3 in rub', new Numbr(400, 'RUB')],
  ['1.5M', new Numbr(1500000)],
  ['100 less payment of -20', new Numbr(80)],
  ['1% + 2% of 10^2', new Numbr(3)],
  ['20 to be less of -10', new Numbr(10)],
  ['3+3 of amount 100', new Numbr(6)],
  ['20% of 100%', new Percent(20)],
  ['5% of 100$', new Numbr(5, 'USD')],
]

for (let [expr, r] of cases) {
  test('evaluate ' + expr, t => {
    let [node,] = parse(lex(expr))
    t.deepEqual(
      node.evaluate({
        rates: {
          'RUB': 1,
          'USD': 2,
        },
        answers: [],
        line: 0,
      }),
      r
    )
  })
}

let nodes = Object.entries(Nodes)
for (let [name, Node] of nodes) {
  test(`node "${name}" have a "kind"`, t => {
    let node = new (Node as any)
    t.is(typeof node.kind, 'string')
  })
}
