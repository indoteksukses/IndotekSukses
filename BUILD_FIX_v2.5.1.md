# Build Fix v2.5.1

Vercel error:

```text
Type error: 'id' is specified more than once
```

Previous code:

```ts
{ id: body.id, ...product, ...updated, sales_store_ids: salesStoreIds }
```

`updated` already contains `id`, so TypeScript rejected the object.

Corrected code:

```ts
{ ...product, ...updated, sales_store_ids: salesStoreIds }
```

No SQL migration is required.
