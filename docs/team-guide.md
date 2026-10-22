# Team guide

## Where your code goes

```text
apps/
  web/src/          WEBSITE (Front-End, UI/UX)
    pages/            one file per page         → HomePage.tsx, MenuPage.tsx
    components/       reusable pieces           → Navbar.tsx, MenuItemCard.tsx
    api/              calls to our API          → menu.ts
    types/            shapes of API data        → menu.ts
    App.tsx           list of pages (routes)
    index.css         brand colors and fonts

  api/src/          API (API Dev, Database)
    routes/           URL → controller          → menu.routes.ts (register in routes/index.ts)
    controllers/      what each URL does        → menu.controller.ts
    models/           MongoDB collections       → MenuItem.ts
    middleware/       runs before controllers   → errorHandler.ts (auth goes here)
    config/           .env settings, DB connect
    scripts/          npm run seed

  mobile/lib/       MOBILE APP (Front-End)
    screens/          one file per screen       → menu_screen.dart
    widgets/          reusable pieces           → menu_item_tile.dart
    services/         calls to our API          → menu_service.dart
    models/           shapes of API data        → menu_item.dart

docs/               Course deliverables (diagrams, API spec, test results)
```

Each app has a README with a step-by-step "adding a page / endpoint / screen" example:
[web](../apps/web/README.md) · [api](../apps/api/apiREADME.md) · [mobile](../apps/mobile/mobileREADME.md).

**Course deliverables** go in `docs/`, one folder each, created when you have the first file:
`docs/diagrams/` (PlantUML `.puml` plus exported `.png`), `docs/api/` (SwaggerHub export), `docs/test-results/`, `docs/prototypes/` (Figma links and exports).

## How a feature flows through the team

Example: **admin adds a menu item**.

1. **UI/UX** links the Figma frame in the issue.
2. **API Dev** updates [the shared OpenAPI contract](api/openapi.yaml) first (URL, request body, response) and synchronizes SwaggerHub through the [contract workflow](api/README.md), so web and mobile can start right away.
3. **Database** updates `apps/api/src/models/MenuItem.ts` if new fields are needed.
4. **API Dev** adds the controller + route and a test.
5. **Front-End** builds the page in `apps/web/src/pages/` and the API call in `apps/web/src/api/`; mobile does the same in `lib/screens/` and `lib/services/`.

The website and mobile app **only talk to the API**. Never connect them straight to MongoDB.

## Workflow

1. **Pick an issue** on the [roadmap](https://github.com/users/rubaismail/projects/13), assign yourself and move it to **In Progress**.
2. **Branch** from the latest `main`. Name it after the issue:

   ```sh
   git checkout main && git pull
   git checkout -b 16-signup-email-verification
   ```

3. **Commit small and often.** Only touch files for your issue.
4. **Run the checks:** `npm run check` (web/API), plus `flutter analyze && flutter test` in `apps/mobile` (mobile).
5. **Open a PR** into `main`. Write `Closes #16` in the description so the issue closes on merge. GitHub runs the same checks automatically.
6. **One teammate reviews** and approves, then merge.

## Rules that save us pain

- Never commit `.env` files or passwords. If you add a new setting, add it (without the real value) to `.env.example`.
- Never use the client's production database for development. Use `eisai_dev`.
- If you change an API response, update the OpenAPI YAML and API README, synchronize SwaggerHub, and tell the web and mobile people in the team chat.
- Stuck for more than an hour? Post in the team chat with what you tried.
