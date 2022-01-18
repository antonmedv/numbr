import {currencySigns} from '../currencies'
import {allOperators} from '../operators'
import {findVars, Varname} from './variables'

const EOF = '\u0003'

export type Kind = 'number'
  | 'percentage'
  | 'variable'
  | 'reference'
  | 'word'
  | 'operator'
  | 'bracket'
  | 'eof'

export type Token = { kind: Kind, value: string, start: number, end: number }

export function lex(code: string, vars: Varname[] = []) {
  let l = new Lexer(
    Array.isArray(code) ? code : [...code],
    findVars(code, vars),
  )

  let colon = l.code.indexOf(':')
  if (colon != -1) {
    l.start = l.end = colon + 1
  }

  let e = l.code.indexOf('=', l.end)
  if (e != -1) {
    let s = l.end
    while (l.code[s] == ' ') {
      s++
    }
    while (l.code[e - 1] == ' ') {
      e--
    }

    let value = l.code.slice(s, e).join('')
    if (/^\p{L}[ \p{L}\p{N}]*$/ui.test(value)) {
      l.tokens.push({kind: 'variable', value, start: s, end: e})
      l.start = l.end = e
    }
  }

  let state: State | null = root
  while (state) {
    state = state(l)
  }
  l.tokens.push({kind: 'eof', value: '', start: l.start, end: l.end})
  return l.tokens
}

class Lexer {
  start = 0
  end = 0
  tokens: Token[] = []

  constructor(
    public code: string[],
    public vars: Map<number, number>,
  ) {
  }

  next() {
    let ch = this.end < this.code.length ? this.code[this.end] : EOF
    this.end++
    return ch
  }

  backup() {
    this.end--
  }

  peek() {
    let ch = this.next()
    this.backup()
    return ch
  }

  word() {
    return this.code.slice(this.start, this.end).join('')
  }

  emit(tag: Kind) {
    let word = this.word()
    let lower = word.toLowerCase()
    if (tag == 'word' && allOperators.has(lower)) {
      tag = 'operator'
      word = lower
    }
    this.tokens.push({kind: tag, value: word, start: this.start, end: this.end})
    this.start = this.end
  }

  drop() {
    this.start = this.end
  }

  accept(valid: RegExp) {
    if (valid.test(this.next())) {
      return true
    }
    this.backup()
    return false
  }

  acceptRun(valid) {
    while (valid.test(this.next())) {
    }
    this.backup()
  }
}

type State = (l: Lexer) => State | null

function root(l: Lexer) {
  let ch = l.next()

  if (ch == EOF) {
    return null
  }

  let varEnd = l.vars.get(l.start)
  if (varEnd != undefined) {
    l.end = varEnd
    l.emit('variable')
    return root
  }

  if ('0' <= ch && ch <= '9') {
    l.backup()
    return number
  }

  if (ch == '💯') {
    l.emit('number')
    return root
  }

  if (ch == '.') {
    if (/[0-9]/.test(l.peek())) {
      l.backup()
      return number
    }
    l.emit('word')
    return root
  }

  if ('()'.includes(ch)) {
    l.emit('bracket')
    return root
  }

  if ('+-*/%^='.includes(ch)) {
    l.emit('operator')
    return root
  }

  if (ch == '_') {
    if (l.accept(/_/)) {
      scanNumber(l)
      l.emit('variable')
      return root
    }
    l.emit('word')
    return root
  }

  if (ch == '⟦') {
    let ch: string
    while ((ch = l.next()) != EOF) {
      if (ch == '⟧') {
        l.emit('reference')
        return root
      }
    }
    l.emit('word')
    return root
  }

  if (currencySigns.has(ch)) {
    l.emit('word')
    return root
  }

  if (isAlphabetic(ch)) {
    l.backup()
    return word
  }

  l.drop() // Spaces and other symbols.
  return root
}

function number(l: Lexer) {
  scanNumber(l)
  if (l.accept(/%/)) {
    l.emit('percentage')
  } else {
    l.emit('number')
  }
  return root
}

function word(l: Lexer) {
  while (isAlphabetic(l.next())) {
  }
  l.backup()
  l.emit('word')
  return root
}

function scanNumber(l: Lexer) {
  let digits = /[0-9]/
  l.acceptRun(digits)
  while (l.accept(/[\s,]/)) {
    if (l.accept(digits)) {
      l.acceptRun(digits)
    } else {
      l.backup()
      break
    }
  }
  if (l.accept(/\./)) {
    l.acceptRun(digits)
  }
  l.accept(/[kM]/)
}

function isAlphabetic(r) {
  return r === '_' || /\p{Alphabetic}/u.test(r)
}

