import test from 'ava'
import {
  Assignment,
  Binary,
  Conversion,
  Currency,
  Fraction,
  Nil,
  Node,
  Percentage,
  Unary,
  Value,
  Variable
} from '../nodes'
import {lex, Token} from './lex'
import {parse} from './parser'
import {Varname} from './variables'

function op(s: string): Token {
  return {kind: 'operator', value: s, start: 0, end: 0}
}

function n(s: number | string): Token {
  return {kind: 'number', value: s.toString(), start: 0, end: 0}
}

function p(s: string): Token {
  return {kind: 'percentage', value: s, start: 0, end: 0}
}

function w(s: string): Token {
  return {kind: 'word', value: s, start: 0, end: 0}
}

function v(s: string): Token {
  return {kind: 'variable', value: s, start: 0, end: 0}
}

function ref(s: string): Token {
  return {kind: 'reference', value: s, start: 0, end: 0}
}

function cur(s: string): Currency {
  return new Currency(w(s))
}

let cases: [string, Node, Varname[]?][] = [
  [
    '',
    new Nil()
  ],
  [
    '1 + 2',
    new Binary(op('+'), new Value(n(1)), new Value(n(2)))
  ],
  [
    '1 + - 2',
    new Binary(op('+'), new Value(n(1)), new Unary(op('-'), new Value(n(2))))
  ],
  [
    '1-2+3',
    new Binary(op('+'),
      new Binary(op('-'),
        new Value(n(1)),
        new Value(n(2))),
      new Value(n(3)))
  ],
  [
    '1+2*3',
    new Binary(op('+'),
      new Value(n(1)),
      new Binary(op('*'),
        new Value(n(2)),
        new Value(n(3))))
  ],
  [
    '1/2+3*4',
    new Binary(op('+'),
      new Binary(op('/'),
        new Value(n(1)),
        new Value(n(2))),
      new Binary(op('*'),
        new Value(n(3)),
        new Value(n(4))))
  ],
  [
    '(1+2)*3',
    new Binary(op('*'),
      new Binary(op('+'),
        new Value(n(1)),
        new Value(n(2))),
      new Value(n(3)))
  ],
  [
    '0.05',
    new Value(n(0.05))
  ],
  [
    '-+0',
    new Unary(op('-'), new Unary(op('+'), new Value(n(0))))
  ],
  [
    '1 % 2%',
    new Binary(op('%'), new Value(n(1)), new Percentage(p('2%')))
  ],
  [
    '(1 - ',
    new Value(n(1)),
  ],
  [
    '1 * 2 %',
    new Binary(op('*'), new Value(n(1)), new Value(n(2))),
  ],
  [
    'Income 128000 usd / per 13 parts month - 25% tax rate',
    new Binary(op('-'),
      new Binary(op('/'),
        new Value(n(128000), cur('usd')),
        new Value(n(13))),
      new Percentage(p('25%'))),
  ],
  [
    '1 % __2',
    new Binary(op('%'), new Value(n(1)), new Variable(v('__2')))
  ],
  [
    '1 ^ 2',
    new Binary(op('^'), new Value(n(1)), new Value(n(2)))
  ],
  [
    '1usd',
    new Value(n(1), cur('usd'))
  ],
  [
    '1 usd',
    new Value(n(1), cur('usd'))
  ],
  [
    'USD 1',
    new Value(n(1), cur('USD'))
  ],
  [
    '$1',
    new Value(n(1), cur('$'))
  ],
  [
    '1$',
    new Value(n(1), cur('$'))
  ],
  [
    '1 usd in rub',
    new Conversion(op('in'), new Value(n(1), cur('usd')), cur('rub')),
  ],
  [
    '(1 usd in RUB)',
    new Conversion(op('in'), new Value(n(1), cur('usd')), cur('RUB')),
  ],
  [
    '(1 usd in thb) to rub',
    new Conversion(op('to'),
      new Conversion(op('in'),
        new Value(n(1), cur('usd')),
        cur('thb')),
      cur('rub')),
  ],
  [
    '7% of $1k 2019',
    new Fraction(op('of'), new Percentage(p('7%')), new Value(n('1k'), cur('$')))
  ],
  [
    '1 btc in usd / 10 users',
    new Binary(op('/'),
      new Conversion(op('in'),
        new Value(n('1'), cur('btc')),
        cur('usd')),
      new Value(n('10')))
  ],
  [
    '1 + 1 btc in usd x 10 users',
    new Binary(op('x'),
      new Conversion(op('in'),
        new Binary(op('+'),
          new Value(n('1')),
          new Value(n('1'), cur('btc'))),
        cur('usd')),
      new Value(n('10')))
  ],
  [
    'var = 1',
    new Assignment(op('='),
      v('var'),
      new Value(n('1'))),
  ],
  [
    'Yearly price = 10k',
    new Assignment(op('='), v('Yearly price'), new Value(n('10k')))
  ],
  [
    'soft_limit = 100M',
    new Assignment(op('='), v('soft_limit'), new Value(n('100M')))
  ],
  [
    'a b + a b c',
    new Binary(op('+'),
      new Variable(v('a b')),
      new Variable(v('a b c'))),
    ['a b' as Varname, 'a b c' as Varname]
  ],
]

for (let [expr, ast, vars] of cases) {
  test('parse ' + expr, t => {
    let [node,] = parse(lex(expr, vars))
    t.is(
      JSON.stringify(node, replacer, 4),
      JSON.stringify(ast, replacer, 4)
    )
  })
}

function replacer(key, value) {
  if (key == 'start' || key == 'end') {
    return undefined
  }
  return value
}
