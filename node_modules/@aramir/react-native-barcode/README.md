# React Native Barcode Generator

Uses [jsbarcode](https://github.com/lindell/JsBarcode) to generate barcode binary data with native svg rendering
via [react-native-svg](https://github.com/software-mansion/react-native-svg).

## Installation

```sh
npm install react-native-svg @aramir/react-native-barcode
```

## Usage

```js
<Barcode format="CODE128" value={"HelloWorld"} />
```

## Properties

| Prop       | Type                     | Default   | Description                                                |
|------------|--------------------------|-----------|------------------------------------------------------------|
| value      | `string`                 | `""`      | the text to be encoded                                     |
| width      | `number`                 | `2`       | the width of a single bar                                  |
| maxWidth   | `number`                 | -         | the max width of the barcode                               |
| height     | `number`                 | `100`     | the height of the barcode                                  |
| format     | `Format`                 | `CODE128` | barcode format (typed enum of the supported formats below) |
| lineColor  | `string`                 | `#000000` | set the color of a single bar                              |
| background | `string`                 | `#ffffff` | container background (`rgba(0,0,0,0)` for transparent)     |
| text       | `React.ReactNode`        | -         | an optional text that will be rendered under the barcode   |
| textStyle  | `TextStyle`              | -         | styles to be applied on the text component                 |
| style      | `ViewStyle`              | -         | styles to be applied on the container                      |
| onError    | `(error: Error) => void` | -         | an optional error handler                                  |

## Supported barcode formats

- [CODE128](https://github.com/lindell/JsBarcode/wiki/CODE128) - high-density linear barcode symbology defined in
  ISO/IEC 15417:2007. Supports all 128 ASCII characters and encodes numbers efficiently.
	- CODE128 (automatic mode switching)
	- CODE128 A/B/C (force mode)
- [EAN](https://github.com/lindell/JsBarcode/wiki/EAN) - European Article Number is a global standard that defines a
  barcode format and a unique numbering system used in retail and trade.
	- EAN-13
	- EAN-8
	- EAN-5
	- EAN-2
	- UPC (A)
	- UPC (E)
- [CODE39](https://github.com/lindell/JsBarcode/wiki/CODE39) - discrete barcode symbology defined in ISO/IEC 16388:2023.
  Specification defines 43 characters, consisting of uppercase letters, numeric digits and a number of special
  characters.
- [ITF](https://github.com/lindell/JsBarcode/wiki/ITF-14) - Interleaved 2 of 5 is a continuous two-width barcode
  symbology encoding digits. Used commercially on 135 film, for ITF-14 barcodes and on cartons of some products, while
  the products inside are labeled with UPC or EAN.
	- ITF
	- ITF-14
- [MSI](https://github.com/lindell/JsBarcode/wiki/MSI) - Modified Plessey is a barcode symbology developed by the MSI
  Data Corporation, based on the original Plessey Code symbology. It is a continuous symbology that is not
  self-checking. Used primarily for inventory control, marking storage containers and shelves in warehouse environments.
	- MSI10
	- MSI11
	- MSI1010
	- MSI1110
- [Pharmacode](https://github.com/lindell/JsBarcode/wiki/pharmacode) - Pharmaceutical Binary Code, is a barcode
  standard, used in the pharmaceutical industry as a packing control system. Designed to be readable despite printing
  errors.
- [Codabar](https://github.com/lindell/JsBarcode/wiki/codabar) - Linear barcode symbology designed to be accurately read
  even when printed on dot matrix printers for multipart forms such as FedEx airbills and blood bank forms.
- CODE93 - alphanumeric, variable length symbology designed in 1982 by Intermec to provide a higher density and data
  security enhancement to Code 39. 