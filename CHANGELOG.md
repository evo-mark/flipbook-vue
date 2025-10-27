## v1.0.2

-   **Improvement**: `pages` prop can now be an array of objects with the following structure:

```ts
type ImageItem = { src: string; alt: string; hiResSrc: string };
```

-   **Improvement**: Alt attributes can be passed to images to improve accessibility
-   **Improvement**: Converted `startPage` prop to a model for two-way binding
