import {
  currenciesList,
  currencySignsToCode,
  findCurrencyCodeByWord
} from '../currencies'
import {
  Assignment,
  Binary,
  Conversion,
  Currency,
  Fraction,
  Nil,
  Node,
  Percentage,
  Reference,
  Sum,
  Unary,
  Value,
  Variable
} from '../nodes'
import {operators} from '../operators'
import {Kind, Token} from './lex'

export type Warning = {
  start: number
  end: number
  message: string
}

class Parser {
  pos = 0
  current: Token
  previous: Token | undefined
  words: Token[] = []

  warnings: Warning[] = []

  constructor(public stream: Token[]) {
    this.current = stream[0]
  }

  next(): void {
    if (this.pos < this.stream.length - 1) {
      this.pos++
    } else {
      return
    }
    this.previous = this.current
    this.current = this.stream[this.pos]
    if (this.previous.kind == 'word') {
      this.words.push(this.previous)
    } else {
      this.words = []
    }
  }

  skip(): void {
    while (this.stream[this.pos].kind == 'word') {
      this.words.push(this.stream[this.pos])
      this.pos++
    }
    this.current = this.stream[this.pos]
  }

  eof(): boolean {
    return this.current.kind == 'eof'
  }

  is(kind: Kind, ...values: string[]): boolean {
    return this.current.kind == kind && (values.includes(this.current.value) || values.length == 0)
  }

  isNext(kind: Kind, ...values: string[]): boolean {
    let token = this.stream[this.pos + 1]
    return token.kind == kind && (values.includes(token.value) || values.length == 0)
  }
}

export function parse(tokens: Token[]): [Node, Warning[]] {
  let p = new Parser(tokens)
  return [assignment(p), p.warnings]
}

function assignment(p: Parser): Node {
  if (p.is('variable') && p.isNext('operator', '=')) {
    let variable = p.current
    p.next()
    let op = p.current
    p.next()
    let rhs = expression(p)
    return new Assignment(op, variable, rhs)
  }
  return expression(p)
}

function expression(p: Parser): Node {
  p.skip()

  let node: Node = multiplication(p)
  while (p.is('operator')) {
    let op = p.current
    let wordsBeforeOp = p.words.length

    p.next()
    if (p.eof()) return node

    if (operators.into.has(op.value)) {
      // Conversion
      if (p.is('word')) {
        let currency = toCurrency(p.current)
        p.next()
        if (currency != undefined) {
          node = new Conversion(op, node, currency)
        }
        p.skip()
      }
    } else if (operators.of.has(op.value)) {
      // Fraction
      if (wordsBeforeOp > 0) {
        // Forbid words before of operator.
        p.skip()
        continue
      }
      let rhs = multiplication(p)
      node = new Fraction(op, node, rhs)
    } else if (operators.addition.has(op.value)) {
      // Addition
      p.skip()
      let rhs = multiplication(p)
      node = new Binary(op, node, rhs)
    } else if (operators.multiplication.has(op.value)) {
      // Multiplication
      p.skip()
      let rhs = power(p)
      node = new Binary(op, node, rhs)
    }
  }
  return node
}

function multiplication(p: Parser): Node {
  let node: Node = power(p)
  while (p.is('operator', ...operators.multiplication)) {
    let op = p.current
    p.next()
    p.skip()
    if (p.eof()) return node
    let rhs = power(p)
    node = new Binary(op, node, rhs)
  }
  return node
}

function power(p: Parser): Node {
  let node: Node = unary(p)
  if (p.is('operator', '^')) {
    let op = p.current
    p.next()
    p.skip()
    let rhs = power(p)
    node = new Binary(op, node, rhs)
  }
  return node
}

function unary(p: Parser): Node {
  if (p.is('operator', '-', '+')) {
    let token = p.current
    p.next()
    p.skip()
    return new Unary(token, unary(p))
  }
  return primary(p)
}

function primary(p: Parser): Node {
  if (p.is('bracket', '(')) {
    p.next()
    p.skip()
    let node = expression(p)
    if (p.is('bracket', ')')) {
      p.next()
      p.skip()
      if (p.eof()) return node
    }
    return node
  }
  return number(p)
}

function toCurrency(token: Token | undefined): Currency | undefined {
  if (token == undefined) {
    return undefined
  }
  let s = token.value.toUpperCase()

  let code = currencySignsToCode.get(s)
  if (code) {
    return new Currency(token)
  }

  code = findCurrencyCodeByWord(s)
  if (code) {
    return new Currency(token)
  }

  if (currenciesList.has(s)) {
    return new Currency(token)
  }
}

function number(p: Parser): Node {
  if (p.current.kind == 'number') {
    let currency = toCurrency(p.words.length > 0 ? p.words[p.words.length - 1] : undefined)
    let node = new Value(p.current, currency)
    p.next()
    currency = toCurrency(p.current)
    if (currency) node.currency = currency
    p.skip()
    return node
  }
  if (p.is('variable')) {
    let currency = toCurrency(p.words.length > 0 ? p.words[p.words.length - 1] : undefined)
    let node: Node = new Variable(p.current)
    p.next()
    currency = toCurrency(p.current) || currency
    if (currency) node = new Conversion(undefined, node, currency)
    p.skip()
    return node
  }
  if (p.is('percentage')) {
    let node = new Percentage(p.current)
    p.next()
    p.skip()
    return node
  }
  if (p.is('reference')) {
    let currency = toCurrency(p.words.length > 0 ? p.words[p.words.length - 1] : undefined)
    let node: Node = new Reference(p.current)
    p.next()
    currency = toCurrency(p.current) || currency
    if (currency) node = new Conversion(undefined, node, currency)
    p.skip()
    return node
  }
  if (p.is('operator', ...operators.sum)) {
    let node = new Sum(p.current)
    p.next()
    p.skip()
    return node
  }

  // Looks like unexpected token. Let's eat and ignore it.
  p.next()
  if (p.eof()) return new Nil()
  return expression(p)
}
