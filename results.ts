export interface Result {
  valueOf(): number
}

export class Nothing implements Result {
  kind: 'nil' = 'nil'

  valueOf(): number {
    throw 'nope'
  }
}

export function nothing() {
  return new Nothing()
}

export class Numbr implements Result {
  kind: 'numbr' = 'numbr'

  constructor(
    public value: number,
    public currency?: string,
  ) {
  }

  valueOf(): number {
    return this.value
  }

  get hasCurrency(): boolean {
    return this.currency != undefined
  }
}

export function numbr(value: number, currency?: string) {
  return new Numbr(value, currency)
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
