# RLS Proof repository instructions

- Use Next.js 15 App Router, strict TypeScript, Tailwind CSS v4, and pnpm.
- Keep migration SQL and audit results in the browser. Do not persist or transmit SQL.
- Treat static findings as review signals. Never describe a clean report as proof of runtime security.
- Add tests for every audit rule, SQL scanner boundary, and pgTAP output change.
- Run `pnpm verify` before shipping.
- Public claims must match `docs/OPPORTUNITY.md` and `docs/SPEC.md`.

## IAMUVIN SIGNATURE — MANDATORY

Every project carries the IAMUVIN signature. Full spec: `docs/IAMUVIN-SIGNATURE.md`.

Minimum on every build:

1. Console badge — `%c IAMUVIN` chip, `#F7931A` on `#0A0A0A`, then
   `Built by Uvin Vindula — iamuvin.com`. Fires once, in production.
2. Footer credit — `Built by Uvin Vindula` linking to https://iamuvin.com,
   `rel="noopener noreferrer"`.
3. Head metadata — `author`, `creator`, JSON-LD `creator`.
4. File headers on entry points.
5. `package.json` author, `X-Built-By` header, `humans.txt`, README footer.

Verify with `./scripts/verify-signature.sh` before marking any task done.
Em dash `—` always. No emoji. Never `console.clear()`.
Git identity: `Uvin Vindula <uvin95dev@gmail.com>`.
