# GhostKey Story

An interactive, scroll-driven explainer for *why* GhostKey exists — not a feature tour, a six-chapter
argument: a normal wallet key can't say "just this much, just this contract, just this long," and that's
the actual root cause behind most key-related hacks. GhostKey's session keys can.

No wallet, no testnet funds, and no running GhostKey server required — everything is simulated
client-side. The crypto isn't faked, though: Chapter 4 generates a real session key and hashes it with
real `SubtleCrypto` SHA-256 in your browser, and the scope-checking in Chapter 5 mirrors the same
`intent_out_of_scope` / `value_exceeds_session_limit` error codes the real server returns (see
[`docs/sdk/hooks.md`](../docs/sdk/hooks.md)).

## Chapters

1. **The Old Way** — a seed-phrase key with no concept of scope, drained by one bad signature
2. **What if the app never held the keys?** — smart accounts + session keys, side by side vs. a normal wallet
3. **Build a session key** — interactive: pick a target app, a spend limit, a TTL; watch the real `SessionKeyRequest` shape build live
4. **Watch the key never leave** — generate a real key, hash it client-side, see exactly what a server would and wouldn't receive
5. **Try to break it** — send within scope (succeeds), then try to exceed it (rejected, with the real error code)
6. **Your NFT collection, and a "free mint"** — the real-world case: a malicious `setApprovalForAll` request against a mock NFT collection. Approve it with a normal wallet and every token is swept; approve it with a GhostKey session key and it's rejected outright, because "all tokens, forever" has no representation in a scoped key. Includes an explicit note on what this *doesn't* protect against (account/credential phishing, social engineering) — this is a defense against malicious approvals specifically, not a general anti-scam claim.

## Run it

```bash
cd story
npm install
npm run dev
```

Opens on `http://localhost:3001`.
