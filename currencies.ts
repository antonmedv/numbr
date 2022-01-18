export type CurrencyCode = string & { kind: 'currency_code' }
export type CurrencyRates = { [currency: CurrencyCode]: number }

export type CurrencyInfo = {
  name: CurrencyCode
  dp: number
}
export const currencies: { [id: CurrencyCode]: CurrencyInfo } = require('./data/currencies.json')
export const cryptoCurrencies: { [id: CurrencyCode]: CurrencyInfo } = require('./data/crypto.json')

export let currenciesList = new Set(Object.keys(currencies).concat(Object.keys(cryptoCurrencies)))

export function updateCurrenciesList(keys: string[]) {
  keys.forEach(id => {
    if (id.toUpperCase() != id) {
      throw new Error(`The currency ${id} is in lowercase!`)
    }
  })
  currenciesList = new Set(keys)
}

export const currencySignsToCode = new Map<string, CurrencyCode>()
currencySignsToCode.set('$', 'USD' as CurrencyCode)
currencySignsToCode.set('＄', 'USD' as CurrencyCode)
currencySignsToCode.set('﹩', 'USD' as CurrencyCode)
currencySignsToCode.set('₽', 'RUB' as CurrencyCode)
currencySignsToCode.set('€', 'EUR' as CurrencyCode)
currencySignsToCode.set('£', 'GBP' as CurrencyCode)
currencySignsToCode.set('฿', 'THB' as CurrencyCode)
currencySignsToCode.set('¥', 'JPY' as CurrencyCode)
currencySignsToCode.set('₣', 'FRF' as CurrencyCode)
currencySignsToCode.set('₩', 'KRW' as CurrencyCode)
export const currencySigns = new Set(currencySignsToCode.keys())

const currencyWordsToCode: [RegExp, CurrencyCode][] = [
  [/^dollars?$/i, 'USD' as CurrencyCode],
  [/^ro?ubl(es?)?$/i, 'RUB' as CurrencyCode],
  [/^euros?$/i, 'EUR' as CurrencyCode],
  [/^baht$/i, 'THB' as CurrencyCode],
  [/^bitcoins?$/i, 'BTC' as CurrencyCode],

  [/^руб(л(ь|и|ей|ях?|ями?)?)?$/i, 'RUB' as CurrencyCode],
  [/^доллар(ы|ов|ами?|ах)?$/i, 'USD' as CurrencyCode],
  [/^бат(ах)?$/i, 'THB' as CurrencyCode],
  [/^битко[йи]н(ы|ами?|ов|ах)?$/i, 'BTC' as CurrencyCode],
]

function findCurrencyCodeByWord(word: string): CurrencyCode | undefined {
  for (let [r, code] of currencyWordsToCode) {
    if (r.test(word)) return code
  }
  return undefined
}

export function findCurrencyCode(word: string): CurrencyCode | undefined {
  word = word.toUpperCase()
  let code = currencySignsToCode.get(word)
  if (code) return code

  code = findCurrencyCodeByWord(word)
  if (code) return code

  if (currenciesList.has(word)) return word as CurrencyCode
  return undefined
}

export function findCurrencyInfo(code: CurrencyCode): CurrencyInfo | undefined {
  return currencies[code] || cryptoCurrencies[code] || undefined
}
