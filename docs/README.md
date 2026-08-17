# 16spaces planning docs

| Date | Status |
| --- | --- |
| 2026-08-16 | Draft / planning — implementation of multiplayer has not started |

These documents are split from the approved multiplayer design. They do not invent product, schema, or API decisions. The playable app today is still the local hot-seat prototype; see the [root README](../README.md).

| Doc | Audience | Contents |
| --- | --- | --- |
| [spec.md](spec.md) | Product + implementers building UX | Rules, modes, options, routes, ELO facing rules, handshake/abort, draws, guests, non-goals |
| [design.md](design.md) | Implementers | Architecture, `lib/game`, clocks, Realtime, auth, schema, RLS, RPCs, APIs, security, observability, alternatives, key decisions K1–K21 |
| [roadmap.md](roadmap.md) | Scheduling | Goals, feature flags, rollout stages, 13-PR plan, open questions, risks |

Live site: https://16space.deno.dev  
Repo: https://github.com/itsnotqwerty/16spaces
