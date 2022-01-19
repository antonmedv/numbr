import Big from 'big.js'
import {CurrencyCode} from './currencies'

export interface Result {}

export class Nothing implements Result {
  kind: 'nil' = 'nil'
}

export class Numbr implements Result {
  kind: 'numbr' = 'numbr'

  constructor(
    public value: Big,
    public currency?: CurrencyCode,
  ) {
    if (currency?.toUpperCase() != currency) {
      throw new Error(`The currency ${currency} is in lowercase!`)
    }
  }

  get hasCurrency(): boolean {
    return this.currency != undefined
  }
}

export class Percent implements Result {
  kind: 'percent' = 'percent'

  constructor(
    public value: Big,
  ) {
  }
}

export class Header implements Result {
  kind: 'header' = 'header'

  constructor(
    public title: string,
  ) {
  }
}
