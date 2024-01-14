import Big from 'big.js'
import {apply} from './apply'
import {
  CurrencyCode,
  CurrencyRates,
  findCurrencyCode,
  findCurrencyInfo,
} from './currencies'
import {Markup} from './markup'
import {Token} from './parser/lex'
import {tokenToVariableName} from './parser/variables'
import {Header, Nothing, Numbr, Percent, Result} from './results'

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
    public token: Token,
  ) {
  }

  evaluate(ctx: Context): Result {
    return new Nothing()
  }

  toCurrencyCode(): CurrencyCode | undefined {
    return findCurrencyCode(this.token.value)
  }

  highlight() {
    let name: string | undefined
    let code = this.toCurrencyCode()
    if (code) {
      name = findCurrencyInfo(code)?.name
    }
    let markup: Markup = []
    markup.push([this.token.start, this.token.end, 'currency', name])
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
    public currency?: Currency,
  ) {
  }

  evaluate(ctx: Context): Result {
    let s = this.value.value
    let multiplier = 1
    if (/µ$/.test(s)) multiplier = 1e-6
    if (/m$/.test(s)) multiplier = 1e-3
    if (/k$/.test(s) || /K$/.test(s)) multiplier = 1e3
    if (/M$/.test(s)) multiplier = 1e6
    if (/B$/.test(s)) multiplier = 1e9
    if (/T$/.test(s)) multiplier = 1e12
    if (s == '💯') s = '100'

    s = s.replace(/[\s,'_]/g, '')
      .replace(/k$/, '')
      .replace(/M$/, '')
    return new Numbr(Big(s).mul(multiplier), this.currency?.toCurrencyCode())
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
    return new Percent(Big(s))
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
    let sum = new Numbr(Big(0))
    for (let i = line - 1; i >= 0; i--) {
      if (answers[i] instanceof Header) {
        break
      }
      if (answers[i] == undefined || answers[i] instanceof Nothing) {
        continue
      }
      if (answers[i] instanceof Numbr) {
        sum = apply((x, y) => x.add(y), sum, answers[i], rates)
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

    if (this.op.value == '-' || this.op.value == '−') {
      if (v instanceof Numbr) {
        return new Numbr(v.value.mul(-1), v.currency)
      }
      if (v instanceof Percent) {
        return new Percent(v.value.mul(-1))
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
          return apply((x, y) => x.add(y), a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Numbr(a.value.mul(Big(1).add(b.value.div(100))), a.currency)
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value.add(b.value))
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        break

      case '-':
      case '−':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply((x, y) => x.minus(y), a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Numbr(a.value.mul(Big(1).minus(b.value.div(100))), a.currency)

        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value.minus(b.value))
        }
        break

      case '*':
      case 'x':
      case 'х':
      case '×':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply((x, y) => x.mul(y), a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Numbr(a.value.mul(b.value).div(100), a.currency)
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Percent(a.value.mul(b.value))
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value.mul(b.value))
        }
        break

      case '/':
        if (a instanceof Numbr && b instanceof Numbr) {
          let c = apply((x, y) => x.div(y), a, b, rates)
          if (a.hasCurrency && b.hasCurrency) {
            c.currency = undefined
          }
          return c
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Percent(a.value.div(b.value))
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value.div(b.value))
        }
        break

      case '%':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply((x, y) => x.mod(y), a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value.mod(b.value))
        }
        break

      case '^':
        if (a instanceof Numbr && b instanceof Numbr) {
          return apply((x, y) => x.pow(+y), a, b, rates)
        }
        if (a instanceof Numbr && b instanceof Percent) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Numbr) {
          return new Nothing()
        }
        if (a instanceof Percent && b instanceof Percent) {
          return new Percent(a.value.pow(+b.value))
        }
        break
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
      return new Numbr(a.value.mul(rates[a.currency]).div(rates[currencyCode]), currencyCode)
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
      return new Numbr(b.value.mul(a.value).div(100), b.currency)
    }
    if (a instanceof Percent && b instanceof Numbr) {
      return new Numbr(b.value.mul(a.value).div(100), b.currency)
    }
    if (a instanceof Percent && b instanceof Percent) {
      return new Percent(b.value.mul(a.value).div(100))
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
    public token: Token,
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
    public token: Token,
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

