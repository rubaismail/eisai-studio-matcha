# Eisai Studio — Team 22

COP 4331C large project: a real-client matcha pop-up website and course-required Flutter app. Final deadline: **November 15, 2026**; exact submission time to confirm.

- [Team22’s Roadmap](https://github.com/users/rubaismail/projects/13/views/1?groupedBy%5BcolumnId%5D=425722583)
- [Project plan](planning/team22-roadmap.md)
- [Development guide](docs/development.md)

## First-time setup: follow these 8 steps

Everyone working on the website or API follows these steps once per laptop. Mobile contributors also follow the [Flutter instructions](docs/development.md#flutter-development) afterward.

### 1. Install the prerequisites

- **Git** to clone the repository.
- **Node.js 18 or newer** to run the setup script. Step 3 installs the exact version our team uses.
- **Docker Desktop** for the local database and email preview. **Open it and wait until Docker is running.** Linux users can use Docker Engine with Compose v2 instead.

Accept your GitHub invitation to this private repository before continuing.

### 2. Clone the repository and open its folder

Open Terminal on Mac/Linux or PowerShell on Windows, then run:

```sh
git clone https://github.com/rubaismail/eisai-studio-matcha.git
cd eisai-studio-matcha
```

Already cloned? Open a terminal in your existing `eisai-studio-matcha` folder instead. **Run all remaining commands from this folder**, where `package.json` and `compose.yaml` are located.

### 3. Install the team's Node version

```sh
node scripts/bootstrap.mjs
```

Wait for it to finish. This downloads Node **24.21.0** and npm **11.19.0** into the project’s `.tools` folder without replacing your computer’s Node installation.

### 4. Activate the tools in your terminal

Run **only the command for your terminal**.

**Mac/Linux (Terminal, bash or zsh):**

```sh
source ./scripts/activate.sh
```

**Windows (PowerShell):**

```powershell
. ./scripts/activate.ps1
```

Repeat this step whenever you open a new terminal for this project.

### 5. Install packages and create your local settings

```sh
npm ci
npm run setup
```

Setup creates `apps/api/.env` and `apps/web/.env` from the committed examples. **You do not need a teammate’s `.env` file, passwords, or cloud credentials for local development.** Keep the generated defaults. Existing `.env` files are preserved.

### 6. Start the database and add sample drinks

Make sure Docker is running, then run:

```sh
npm run services:up
npm run db:seed
```

Wait for both commands to finish. Each teammate gets their own local database. Seeding adds missing sample drinks and preserves edits to existing ones.

### 7. Start the website and API

```sh
npm run dev
```

Leave this terminal running while you work. Use a second terminal for other commands; remember to activate the tools there too.

### 8. Open the website and check it works

Open **http://localhost:5173** in your browser.

You are ready when you see **two sample drinks** and **“API and database connected.”** These are sample items, not the client's final menu.

If something fails, run `npm run doctor` in a second activated terminal and see [troubleshooting](docs/development.md#troubleshooting).

## Starting work next time

1. Open Docker Desktop and wait until it is running.
2. Open a terminal in `eisai-studio-matcha` and activate the tools using the command in **step 4** above.
3. With your previous development server stopped, run:

   ```sh
   git pull --ff-only
   npm ci
   npm run services:up
   npm run dev
   ```

4. Open **http://localhost:5173**. You do not need to repeat setup or seeding every day.

**When you finish:** press **Ctrl+C** in the running terminal to stop the website/API. Run `npm run services:down` to stop the database and email service. Your database data is kept.

## Viewing your local database and email

- **Database:** open MongoDB Compass, connect to `mongodb://127.0.0.1:27017`, then open the `eisai_dev_local` database → `menuItems` collection. No username or password is needed for this local database. Docker must be running and step 6 must be complete. Compass is optional; it is a separate desktop app, not a browser page.
- **Email preview:** run `npm run mail:test` in an activated terminal, then open **http://localhost:8025**. Test messages stay in the local inbox.

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
