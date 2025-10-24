<p align="center">
    <a href="https://evomark.co.uk" target="_blank" alt="Link to evoMark's website">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://evomark.co.uk/wp-content/uploads/static/evomark-logo--dark.svg">
          <source media="(prefers-color-scheme: light)" srcset="https://evomark.co.uk/wp-content/uploads/static/evomark-logo--light.svg">
          <img alt="evoMark company logo" src="https://evomark.co.uk/wp-content/uploads/static/evomark-logo--light.svg" width="500">
        </picture>
    </a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/dm/@evomark/flipbook-vue.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/@evomark/flipbook-vue"><img src="https://img.shields.io/npm/v/@evomark/flipbook-vue.svg" alt="Version"></a>
  <a href="https://github.com/evo-mark/flipbook-vue/blob/main/LICENCE"><img src="https://img.shields.io/github/license/evo-mark/flipbook-vue?style=flat" alt="Licence"></a>
</p>

# Flipbook Vue

`flipbook-vue` is a Vue component that displays images in 3D page flip effect.

Demo page is [here](https://ts1.github.io/flipbook-vue/).

## Fork

Due to some bugs with this package and modern versions of Vue 3, we decided to fork this project. We have also:

-   Converted from Coffeescript to Typescript
-   Converted Options API to Composition API
-   Dropped support for Vue2
-   Added Vite bundler
-   Added ESLint and Prettier
-   Cleaned up various bits of code

## Installation

```sh
pnpm add @evomark/flipbook-vue
```

or

```sh
yarn add @evomark/flipbook-vue
```

or

```sh
npm i @evomark/flipbook-vue
```

## Usage

```html
<template>
	<Flipbook class="flipbook" :pages="['array', 'of', 'image', 'URLs']"></Flipbook>
</template>

<script setup>
	import Flipbook from "@evomark/flipbook-vue";
</script>

<style>
	@import "@evomark/flipbook-vue/style";
	.flipbook {
		width: 90vw;
		height: 90vh;
	}
</style>
```

## Props

### `pages`

Array of image URLs. Required.
All images should have the same aspect ratio.

If the first element is `null`, the next element is displayed alone (as the cover page).

All other props are optional.

### `pagesHiRes`

Array of high resolution versions of image URLs.
They are used when zoomed.

### `flipDuration`

Duration of page flipping animation in milliseconds.
Defaults to 1000.

### `zoomDuration`

Duration of zoom in/out animation in milliseconds.
Defaults to 500.

### `zooms`

Array of possible magnifications.
`null` is equivalent to `[1]` (no zoom).
Defaults to `[1, 2, 4]`. _NOTE_ : Do **NOT** pass an empty array.

### `ambient`

Intensity of ambient light in 0 to 1.
Smaller value gives more shades.
Defaults to 0.4.

### `gloss`

Intensity of specular light in 0 to 1.
Higher value gives more gloss.
Defaults to 0.6.

### `perspective`

Z-axis distance in pixels between the screen and the viewer.
Higher value gives less effect.
Defaults to 2400.

### `nPolygons`

How many rectangles a single page is horizontally split into.
Higher value gives higher quality rendering in exchange for performance.
Defaults to 10.

### `singlePage`

Force single page mode regardless of viewport size.
Defaults to false.

### `forwardDirection`

Reading direction.
If your document is right-to-left, set this `"left"`.
Default is `"right"`.

### `centering`

Enable centering of the cover pages.
Default is `true`.

### `startPage`

Page number (>= 1) to open.
Default is `null`.

### `loadingImage`

URL of an image that is displayed while page is loading.
By default internal animated SVG is used.

### `clickToZoom`

Zoom in or out on click or tap. Default is `true`.

### `dragToFlip`

Flip page by dragging/swiping. Default is `true`.

### `wheel`

When set to `'zoom'`, mouse wheel events zoom in/out the page.
Default is `'scroll'`, wheel events and touch pad scroll gestures scroll the zoomed page.

## Events

### `flip-left-start`

Fired when flip to left animation starts. Argument is page number before flip.

### `flip-left-end`

Fired when flip to left animation ends. Argument is page number after flip.

### `flip-right-start`

Fired when flip to right animation starts. Argument is page number before flip.

### `flip-right-end`

Fired when flip to right animation ends. Argument is page number after flip.

### `zoom-start`

Fired when zoom-in/out animation starts.
Argument is magnification after zoom.

### `zoom-end`

Fired when zoom-in/out animation ends.
Argument is magnification after zoom.

## Slot props

This component exposes some properties and methods as slot properties.
Example usage:

```html
<flipbook :pages="pages" v-slot="flipbook">
	<button @click="flipbook.flipLeft">Previous Page</button>
	<button @click="flipbook.flipRight">Next Page</button>
</flipbook>
```

For more practical usage, refer to [`src/App.vue`](https://github.com/ts1/flipbook-vue/blob/master/src/App.vue) (the demo page source).

These properties and methods can also be referred through `$refs` to the `flipbook` component.

### `canFlipLeft`

True if it can flip to previous page. _NOTE_: Can return false if currently being animated.

### `canFlipRight`

True if it can flip to next page. _NOTE_: Can return false if currently being animated.

### `canZoomIn`

True if it can zoom in.

### `canZoomOut`

True if it can zoom out.

### `page`

Current page number (1 to `numPages`).

### `numPages`

Total number of pages.

### `flipLeft()`

Method to flip to previous page.

### `flipRight()`

Method to flip to next page.

### `zoomIn()`

Method to zoom in.

### `zoomOut()`

Method to zoom out.

## CSS API

You may need to specify the size of view port in your style sheet, directly to
`<flipbook>` element, or to `.viewport` sub-element of flipbook.

If the size is horizontally long and `singlePage` prop is `false` (default), it displays two pages spread, suitable for desktop browsers.
If it's vertically long, it displays single pages, suitable for smartphones.

There are some internal classes.

### `.viewport`

A `<div>` element that contains everything but `<slot>`.
`<slot>` is placed above `.viewport`.

### `.bounding-box`

Approximate bounding box of the displayed images.
Suitable to give `box-shadow`.

## Browser support

Supports modern browsers.

## Development

To start development server with demo pages:

```
pnpm i -r
pnpm run demo
```

## Credits

-   evoMark: Current maintainer
-   vivekKodira: README correction
-   siderisng: `dragToFlip`
-   MaikoTan: TypeScript support
