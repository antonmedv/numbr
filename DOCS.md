# Documentation

Numbr is a smart calculator combined with a notepad.
You can use notes with numbers alongside each other. Use words
around your calculations, so that they will make sense later.

```
$500 for tickets + $70 for a taxi
```

## Formatting

Use `#` symbol at beginning of a line to mark it as a **header**.

Use `:` colon to mark first part of line as **description**.

## Numbers

- `0.5 + .5` - decimal numbers
- `1k` - one thousand
- `1 000 000` - million with spaces
- `1,000,000` - million with commas
- `1M` - million with letter

## Operators

Supported operators `+`, `-`, `*` or `x`, `/`, `%`, `^`.

- Modulus via `12 % 10`
- Exponent via `2 ^ 3`
- Percentage addition `100 + 25%`
- Percentage subtraction `100 - 25%`
- Percentage calculation `25% of 100` or `100 * 25%`

## Currencies

Numbr can do math with lots of currencies. Currency exchange rates are updated every hour.

Use currency symbols (`$`, `€`, `₽`, `£`, `¥`, `₩`) or ISO codes:

- `$100 + 50EUR`
- `20CAD in USD`

Numbr supports cryptocurrencies as well:

- `1 btc in usd`
- `1 eth in doge`
- `10 xrp in ada`

## Sum

Numbr can summarize results by using `total` or `sum` operators. Calculations are done up to the nearest header:

```md
## header 1

Milk $3
Eggs $2
Sugar $1
Flour $5
Total

## header 2

100k usd
10 btc
1M chf
Sum
```

## References

Numbr supports referencing calculation results. Click on the answer to copy, and paste to reference, or press
*Alt+Enter* to put the current answer on the next line.

```
100 + 200                 | 300
(300) + 25%               | 375
```

## Variables

Numbr supports variables with `=` operator. Variable names are case-insensitive and can contain letters, numbers and
spaces:

```
iPhone 15 = $998
AirPods Pro = $249
Price difference: iphone 15 - airpods pro
```
