export type CurrencyRates = { [currency: string]: number }

export const currencySignsToCode = new Map<string, string>()
currencySignsToCode.set('$', 'USD')
currencySignsToCode.set('＄', 'USD')
currencySignsToCode.set('﹩', 'USD')
currencySignsToCode.set('₽', 'RUB')
currencySignsToCode.set('€', 'EUR')
currencySignsToCode.set('£', 'GBP')
currencySignsToCode.set('฿', 'THB')
currencySignsToCode.set('¥', 'JPY')
currencySignsToCode.set('₣', 'FRF')
currencySignsToCode.set('₩', 'KRW')
export const currencySigns = new Set(currencySignsToCode.keys())

export const currencyWordsToCode: [RegExp, string][] = [
  [/^dollars?$/i, 'USD'],
  [/^ro?ubl(es?)?$/i, 'RUB'],
  [/^euros?$/i, 'EUR'],
  [/^baht$/i, 'THB'],
  [/^bitcoins?$/i, 'BTC'],

  [/^руб(л(ь|и|ей|ях?|ями?)?)?$/i, 'RUB'],
  [/^доллар(ы|ов|ами?|ах)?$/i, 'USD'],
  [/^бат(ах)?$/i, 'THB'],
  [/^битко[йи]н(ы|ами?|ов|ах)?$/i, 'BTC'],
]

export function findCurrencyCodeByWord(word: string): string | undefined {
  for (let [r, code] of currencyWordsToCode) {
    if (r.test(word)) return code
  }
  return undefined
}

export let allCurrencies = new Set(
  require('./currencies/currencies.json').concat(
    require('./currencies/crypto.json'))
)

export function updateAllCurrencies(keys: string[]) {
  allCurrencies = new Set(keys)
}

export const otherCurrencies = new Set(require('./currencies/crypto.json'))


