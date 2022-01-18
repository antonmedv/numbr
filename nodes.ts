import {
  currenciesList, CurrencyCode,
  CurrencyRates,
  currencySignsToCode, findCurrencyCode,
  findCurrencyCodeByWord, findCurrencyInfo
} from './currencies'
import {Markup} from './markup'
import {Token} from './parser/lex'
import {tokenToVariableName} from './parser/variables'
import {
  Header,
  Nothing,
  Numbr,
  Percent,
  Result
} from './results'

export type Context = {
  rates: CurrencyRates
  answers: any[]
  line: number
}

export interface Node {
  evaluate(ctx: Context): Result

  highlight(): Markup

  toString(): string
}

export class Currency implements Node {
  kind: 'currency' = 'currency'

  constructor(
    public token: Token
  ) {
  }

  evaluate(ctx: Context): Result {
    return new Nothing()
  }

  toCurrencyCode(): CurrencyCode | undefined {
    return findCurrencyCode(this.token.value)
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.token.start, this.token.end, 'currency', findCurrencyInfo(this.token.value).name])
    return markup
  }

  toString() {
    return this.toCurrencyCode() || '???'
  }
}

export class Nil implements Node {
  kind: 'nil' = 'nil'

  evaluate(ctx: Context): Result {
    return new Nothing()
  }

  highlight() {
    return []
  }

  toString() {
    return 'nil'
  }
}

export class Value implements Node {
  kind: 'value' = 'value'

  constructor(
    public value: Token,
    public currency?: Currency
  ) {
  }

  evaluate(ctx: Context): Result {
    let s = this.value.value
    let multiplier = 1
    if (/k$/.test(s)) multiplier = 1e3
    if (/M$/.test(s)) multiplier = 1e6
    if (s == '💯') s = '100'

    s = s.replace(/[\s,]/g, '')
      .replace(/k$/, '')
      .replace(/M$/, '')
    return new Numbr(Number(s) * multiplier, this.currency?.toCurrencyCode())
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.value.start, this.value.end, 'number'])
    markup.push(...this.currency?.highlight() || [])
    return markup
  }

  toString() {
    return this.value.value + (this.currency?.toString() || '')
  }
}

export class Percentage implements Node {
  kind: 'percentage' = 'percentage'

  constructor(
    public value: Token,
  ) {
  }

  evaluate(ctx: Context): Result {
    let s = this.value.value.substring(0, this.value.value.length - 1)
    return new Percent(Number(s))
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.value.start, this.value.end - 1, 'number'])
    markup.push([this.value.end - 1, this.value.end, 'operator'])
    return markup
  }

  toString() {
    return this.value.value
  }
}

export class Sum implements Node {
  kind: 'sum' = 'sum'

  constructor(
    public token: Token,
  ) {
  }

  evaluate(ctx: Context): Result {
    let {rates, answers, line} = ctx
    let sum: Result = new Numbr(0)
    for (let i = line - 1; i >= 0; i--) {
      if (answers[i] instanceof Header) {
        break
      }
      if (answers[i] == undefined || answers[i] instanceof Nothing) {
        continue
      }
      if (answers[i] instanceof Numbr) {
        sum = apply(Numbr, (x, y) => x + y, sum as Numbr, answers[i], rates)
      } else {
        return new Nothing()
      }
    }
    return sum
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.token.start, this.token.end, 'operator'])
    return markup
  }

  toString() {
    return this.token.value
  }
}

export class Unary implements Node {
  kind: 'unary' = 'unary'

  constructor(
    public op: Token,
    public node: Node,
  ) {
  }

  evaluate(ctx: Context): Result {
    let v = this.node.evaluate(ctx)

    if (this.op.value == '-') {
      if (v instanceof Numbr) {
        return new Numbr(-v.value, v.currency)
      }
      if (v instanceof Percent) {
        return new Percent(-v.value)
      }
    }

    return v
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.op.start, this.op.end, 'operator'])
    markup.push(...this.node.highlight())
    return markup
  }

  toString() {
    return `${this.op.value}(${this.node.toString()})`
  }
}

function apply(
  Kind: new (value: number, currency?: CurrencyCode) => Result,
  op: (x: number, y: number) => number,
  a: Numbr,
  b: Numbr,
  rates: CurrencyRates
): Result {
  if (a.currency == undefined || b.currency == undefined) {
    return new Kind(op(a.value, b.value), b.currency || a.currency)
  }
  if (a.currency == b.currency) {
    return new Kind(op(a.value, b.value), b.currency)
  }
  if (rates[a.currency] == undefined || rates[b.currency] == undefined) {
    return new Nothing()
  }
  return new Kind(op(a.value * rates[a.currency] / rates[b.currency], b.value), b.currency)
}

export class Binary implements Node {
  kind: 'binary' = 'binary'

  constructor(
    public op: Token,
    public left: Node,
    public right: Node,
  ) {
  }

  evaluate(ctx: Context): Result {
    let rates = ctx.rates
    let a = this.left.evaluate(ctx)
    let b = this.right.evaluate(ctx)

    if (b instanceof Nothing) {
      return a
    }

    switch (this.op.value) {
      case '+':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply(Numbr, (x, y) => x + y, a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Numbr(a.value * (1 + b.value / 100), a.currency)
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value + b.value)
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        break

      case '-':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply(Numbr, (x, y) => x - y, a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Numbr(a.value * (1 - b.value / 100), a.currency)

        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value - b.value)
        }
        break

      case '*':
      case 'x':
      case 'х':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply(Numbr, (x, y) => x * y, a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Numbr(a.value * b.value / 100, a.currency)
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Percent(a.value * b.value)
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value * b.value)
        }
        break

      case '/':
        if (a instanceof Numbr && b instanceof Numbr) {
          let c = apply(Numbr, (x, y) => x / y, a, b, rates)
          if (a.hasCurrency && b.hasCurrency && c instanceof Numbr) {
            c.currency = undefined
          }
          return c
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Percent(a.value / b.value)
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value / b.value)
        }
        break

      case '%':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply(Numbr, (x, y) => x % y, a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value % b.value)
        }
        break

      case '^':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply(Numbr, (x, y) => x ** y, a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value ** b.value)
        }
        break
    }
    return new Nothing()
  }

  highlight() {
    let markup: Markup = []
    if (this.op.value == '^' &&
      this.right instanceof Value
      && this.op.end == this.right.value.start
    ) {
      markup.push([this.right.value.start, this.right.value.end, 'exp'])
      markup.push([this.op.start, this.op.end, 'none'])
    } else {
      markup.push([this.op.start, this.op.end, 'operator'])
    }
    markup.push(...this.left.highlight())
    markup.push(...this.right.highlight())
    return markup
  }

  toString() {
    return `(${this.left.toString()} ${this.op.value} ${this.right.toString()})`
  }
}

export class Conversion implements Node {
  kind: 'conversion' = 'conversion'

  constructor(
    public op: Token | undefined,
    public node: Node,
    public currency: Currency,
  ) {
  }

  evaluate(ctx: Context): Result {
    let rates = ctx.rates
    let a = this.node.evaluate(ctx)
    let currencyCode = this.currency.toCurrencyCode()

    if (a instanceof Numbr) {
      if (a.currency == undefined) {
        return new Numbr(a.value, currencyCode)
      }
      if (currencyCode == undefined) {
        return a
      }
      if (rates[a.currency] == undefined || rates[currencyCode] == undefined) {
        return a
      }
      return new Numbr(a.value * rates[a.currency] / rates[currencyCode], currencyCode)
    }

    if (a instanceof Percent) {
      return new Percent(a.value)
    }

    return new Nothing()
  }

  highlight() {
    let markup: Markup = []
    if (this.op) markup.push([this.op.start, this.op.end, 'operator'])
    markup.push(...this.node.highlight())
    markup.push(...this.currency.highlight())
    return markup
  }

  toString() {
    return `(${this.node.toString()} ${this.op?.value} ${this.currency.toString()})`
  }
}

export class Fraction implements Node {
  kind: 'fraction' = 'fraction'

  constructor(
    public op: Token,
    public left: Node,
    public right: Node,
  ) {
  }

  evaluate(ctx: Context): Result {
    let a = this.left.evaluate(ctx)
    let b = this.right.evaluate(ctx)

    if (a instanceof Numbr && b instanceof Numbr) {
      return new Numbr(b.value * a.value / 100, b.currency)
    }
    if (a instanceof Percent && b instanceof Numbr) {
      return new Numbr(b.value * a.value / 100, b.currency)
    }
    if (a instanceof Percent && b instanceof Percent) {
      return new Percent(b.value * a.value / 100)
    }

    return new Nothing()
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.op.start, this.op.end, 'operator'])
    markup.push(...this.left.highlight())
    markup.push(...this.right.highlight())
    return markup
  }

  toString() {
    return `(${this.left.toString()} ${this.op.value} ${this.right.toString()})`
  }
}

export class Assignment implements Node {
  kind: 'assignment' = 'assignment'

  constructor(
    public op: Token,
    public variable: Token,
    public node: Node,
  ) {
  }

  evaluate(ctx: Context): Result {
    let a = this.node.evaluate(ctx)
    globalThis[tokenToVariableName(this.variable)] = a
    return a
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.variable.start, this.variable.end, 'variable'])
    markup.push([this.op.start, this.op.end, 'operator'])
    markup.push(...this.node.highlight())
    return markup
  }

  toString() {
    return `TODO ${this.op.value} ${this.node.toString()})`
  }
}

export class Variable implements Node {
  kind: 'variable' = 'variable'

  constructor(
    public token: Token
  ) {
  }

  evaluate(ctx: Context): Result {
    let result = globalThis[tokenToVariableName(this.token)]
    if (Number.isFinite(result)) {
      return new Numbr(result)
    }
    return result
  }

  highlight() {
    let markup: Markup = []
    markup.push([this.token.start, this.token.end, 'variable'])
    return markup
  }

  toString() {
    return this.token.value
  }
}

export class Reference implements Node {
  kind: 'reference' = 'reference'

  constructor(
    public token: Token
  ) {
  }

  evaluate(ctx: Context): Result {
    return new Nothing()
  }

  highlight() {
    return []
  }

  toString() {
    return this.token.value
  }
}

