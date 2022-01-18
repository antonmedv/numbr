import {CurrencyCode} from './currencies'

export interface Result {
  valueOf(): number
}

export class Nothing implements Result {
  kind: 'nil' = 'nil'

  valueOf(): number {
    throw 'nope'
  }
}

export class Numbr implements Result {
  kind: 'numbr' = 'numbr'

  constructor(
    public value: number,
    public currency?: CurrencyCode,
  ) {
    if (currency?.toUpperCase() != currency) {
      throw new Error(`The currency ${currency} is in lowercase!`)
    }
  }

  valueOf(): number {
    return this.value
  }

  get hasCurrency(): boolean {
    return this.currency != undefined
  }
}

export class Percent implements Result {
  kind: 'percent' = 'percent'

  constructor(
    public value: number,
  ) {
  }

  valueOf(): number {
    return this.value
  }
}

export class Header implements Result {
  kind: 'header' = 'header'

  constructor(
    public title: string,
  ) {
  }

  valueOf(): number {
    throw 'nope'
  }
}
