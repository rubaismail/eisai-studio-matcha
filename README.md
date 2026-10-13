# Eisai Studio — Team 22

COP 4331C large project: a real-client matcha pop-up website and course-required Flutter app. Final deadline: **November 15, 2026**; exact submission time to confirm.

- [Team22’s Roadmap](https://github.com/users/rubaismail/projects/13/views/1?groupedBy%5BcolumnId%5D=425722583)
- [Project plan](planning/team22-roadmap.md)
- [Development guide](docs/development.md)

## Local development

Prerequisites: Git, an existing Node 18+ for bootstrap, and running Docker Desktop/Compose v2. Bootstrap installs project-local **Node 24.21.0 / npm 11.19.0** without replacing your system versions.

```sh
git clone https://github.com/rubaismail/eisai-studio-matcha.git
cd eisai-studio-matcha
node scripts/bootstrap.mjs
source ./scripts/activate.sh
npm ci
npm run setup
npm run services:up
npm run db:seed
npm run dev
```

On **PowerShell**, replace `source ./scripts/activate.sh` with `. ./scripts/activate.ps1`. Activate again in each new terminal. If the pinned Node/npm are already on PATH, skip bootstrap/activation.

Open **http://localhost:5173**. The starter displays sample menu data through React → Express → MongoDB. Run `npm run mail:test` and open **http://localhost:8025** to verify local email capture. No cloud credentials are needed for this local workflow.

`npm run setup` preserves existing configuration; seeding preserves existing sample-item edits. `npm run services:down` stops containers while retaining MongoDB data.

## Structure and checks

```text
apps/web/       React + TypeScript
apps/api/       Express + TypeScript, MongoDB
apps/mobile/    Flutter (Android, iOS, web)
scripts/        Bootstrap, setup and tool checks
docs/           Team onboarding and troubleshooting
compose.yaml    Pinned local MongoDB and Mailpit
```

```sh
npm run check
npm run test:integration
```

Mobile contributors run `node scripts/bootstrap.mjs --mobile`, activate tools, then `npm run mobile:setup` and `npm run mobile:check`. Flutter is pinned to **3.35.7 / Dart 3.9.2** for compatibility with the development laptop. See the [Flutter instructions](docs/development.md#flutter-development) for emulator addresses, JDK 17, Android SDK and Xcode prerequisites. `mobile:check` builds Flutter web; Android/iOS need their native toolchains.

## Scope and milestones

This is a development foundation with sample content. Authentication, client-only menu/photo administration, approved Figma design, and cloud deployment remain roadmap work. The course deployment must use remote MongoDB; local Docker supports isolated development and integration tests. GrubHub is a feasibility/link task; custom ordering and loyalty are outside the baseline.

| Milestone                     | Target      |
| ----------------------------- | ----------- |
| Scope and design              | October 21  |
| Core implementation           | November 1  |
| Integration and client review | November 8  |
| Release and submission        | November 15 |

Production target is November 12, followed by handoff and rehearsal. Issues remain unassigned until the team chooses owners.
