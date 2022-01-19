import Big from 'big.js'
import {CurrencyCode, CurrencyRates} from './currencies'
import {Nothing, Numbr, Result} from './results'

export function apply(
  op: (x: Big, y: Big) => Big,
  x: Numbr,
  y: Numbr,
  rates: CurrencyRates
): Numbr {
  if (x.currency == undefined || y.currency == undefined) {
    return new Numbr(op(x.value, y.value), y.currency || x.currency)
  }
  if (x.currency == y.currency) {
    return new Numbr(op(x.value, y.value), y.currency)
  }
  if (rates[x.currency] == undefined || rates[y.currency] == undefined) {
    throw new Error(`No currency rates for ${x.currency}/${y.currency}.`)
  }
  return new Numbr(op(x.value.mul(rates[x.currency]).div(rates[y.currency]), y.value), y.currency)
}
