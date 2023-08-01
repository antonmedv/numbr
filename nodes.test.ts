import test from 'ava'
import Big from 'big.js'
import {CurrencyCode, CurrencyRates} from './currencies'
import {lex} from './parser/lex'
import {parse} from './parser/parser'
import * as Nodes from './nodes'
import {Numbr, Percent, Result} from './results'

function numbr(n: number, currency?: string): Numbr {
  return new Numbr(new Big(n), currency as CurrencyCode)
}

let cases: [string, Result][] = [
  ['1 + 2', numbr(3)],
  ['.2 + .1', numbr(.3)],
  ['1 + - 2', numbr(-1)],
  ['1-2+3', numbr(2)],
  ['1+2*3', numbr(7)],
  ['0.05', numbr(0.05)],
  ['-+0', numbr(-0)],
  ['(1 - ', numbr(1)],
  ['1 * 2 %', numbr(2)],
  ['2x20', numbr(40)],
  ['100 + 5%', numbr(105)],
  ['100 rub + 25%', numbr(125, 'RUB')],
  ['100 rub - 200%', numbr(-100, 'RUB')],
  ['100 - (5% + 5%)', numbr(90)],
  ['font-size: 20px;', numbr(20)],
  ['1 000 000', numbr(1000000)],
  ['1\'000_000', numbr(1000000)],
  ['1 usd in rub', numbr(2, 'RUB')],
  ['100 + 25% in rub', numbr(125, 'RUB')],
  ['100 рублей в долларах', numbr(50, 'USD')],
  ['100 in thb + 50% in income + 300', numbr(450, 'THB')],
  ['100 - 100 in rub + (3 usd in rub) / 3 in rub', numbr(2, 'RUB')],
  ['100 usd in rub + 300% / 3 in rub', numbr(400, 'RUB')],
  ['1.5M', numbr(1500000)],
  ['100 less payment of -20', numbr(80)],
  ['1% + 2% of 10^2', numbr(3)],
  ['20 to be less of -10', numbr(10)],
  ['3+3 of amount 100', numbr(6)],
  ['20% of 100%', new Percent(new Big(20))],
  ['5% of 100$', numbr(5, 'USD')],
]

for (let [expr, r] of cases) {
  test('evaluate ' + expr, t => {
    let [node,] = parse(lex(expr))
    t.deepEqual(
      node.evaluate({
        rates: {
          'RUB': 1,
          'USD': 2,
        } as CurrencyRates,
        answers: [],
        line: 0,
      }),
      r
    )
  })
}

let nodes = Object.entries(Nodes)
for (let [name, Node] of nodes) {
  test(`${name} has a kind`, t => {
    let node = new (Node as any)
    t.is(typeof node.kind, 'string')
  })
}
