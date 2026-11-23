# Open Questions (Bob appends here; owner resolves)

Format: `- [ ] Q# (task) question — proposed default`

- [ ] Q1 (all) Wireframe totals are inconsistent (₹470 on cart vs ₹580 on payment). — Default: server-calculated total shown on both.
- [ ] Q2 (T03) "Brand" = publisher? — Default: yes.
- [ ] Q3 (T08) Gift point and coupon rules are invented defaults (see FR-GIFT-01, FR-CPN-01). — Default: as written.
- [ ] Q4 (T10) Is "Reduce order" required? — Default: out of scope.
- [ ] Q5 (T00) 02-ARCHITECTURE §3 example JWT_SECRET=change-me-at-least-32-chars is only 27 chars and fails the 32-char zod rule. — Default: .env.example uses a longer placeholder (change-me-to-a-random-string-of-at-least-32-chars).
- [ ] Q6 (T00) Latest TypeScript is 7.x but typescript-eslint 8.x only supports <6.1. — Default: TypeScript ^6.0.3 in both packages.
- [ ] Q7 (T00) §2 says Node 20 LTS or newer; current Vite 8 / Vitest 5 need Node >=22.12. — Default: engines node >=22.12.0.
- [ ] Q8 (T00) §2 lists Containers as postgres/backend/frontend; security policy requires Red Hat registry images. — Default: registry.redhat.io/rhel9/postgresql-16 and ubi9/nodejs-22-minimal (needs registry.redhat.io login). Backend/frontend compose services deferred to T15; Dockerfiles exist as files per §4.
