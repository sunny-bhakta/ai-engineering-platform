## INstall Dependencies
```
pnpm add -D typescript --filter ./packages/config
```
---


 # 1) Monorepo Setup

```bash
pnpm install
````


```
pnpm typecheck
```

```
pnpm lint
```

```
pnpm test
```

```
pnpm build
```

---

 ##  Start the API

```
pnpm dev:api
```

```
curl http://localhost:3000/health
```

 Expected:

```
{
  "status": "ok"
}
```



```
                 Monorepo
                    │
        ┌───────────┴───────────┐
        │                       │
       apps                  packages
        │                       │
   ┌────┼────┐             ┌────┴────┐
   │    │    │             │         │
  API Worker Ingestion   Shared    Config
   │
   │
 /health
```
