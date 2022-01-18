export const operators = {
  addition: new Set(['+', '-']),
  multiplication: new Set(['*', 'x', 'х', '/', '%']),
  into: new Set(['in', 'to', 'в']),
  of: new Set(['of', 'от']),
  sum: new Set(['sum', 'total', 'всего', 'сумма']),
}

export const allOperators: Set<string> = new Set()
for (let s of Object.values(operators))
  for (let op of s)
    allOperators.add(op)
