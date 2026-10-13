# Reproducible local development

This is a working development foundation, not the finished client application. React and Flutter read sample menu data from Express and MongoDB. Account creation, verification/reset workflows, admin editing, uploads, final design and cloud deployment remain roadmap tasks.

Start with the **[8 numbered setup steps in the README](../README.md#first-time-setup-follow-these-8-steps)**. This page is the detailed reference for configuration, mobile development, checks and troubleshooting.

## Prerequisites

| Tool        | Team version                                                                                       | Who needs it                    |
| ----------- | -------------------------------------------------------------------------------------------------- | ------------------------------- |
| Git         | Current supported version                                                                          | Everyone                        |
| Node.js     | **24.21.0**, including **npm 11.19.0**                                                             | Web/API and root helper scripts |
| Docker      | Docker Desktop with Compose v2, or Docker Engine + Compose v2 on Linux                             | Local MongoDB and email preview |
| Flutter     | **3.35.7**, including Dart **3.9.2**                                                               | Mobile contributors only        |
| Java        | JDK **17**                                                                                         | Android builds only             |
| Android SDK | Platform **36**, build tools **35.0.0**; NDK/Gradle versions come from the pinned Flutter scaffold | Android builds only             |
| Xcode       | A version compatible with your macOS and Flutter SDK                                               | iOS development on macOS only   |

Node and Flutter are exact-version checks, not floating `latest` installs. Flutter 3.35.7 was selected because it runs on the development laptop's macOS 13; Flutter 3.47.7's Dart runtime requires macOS 14. Upgrade as a team through a tested PR, not per-developer SDK upgrades.

Install Node from the [official release directory](https://nodejs.org/dist/v24.21.0/), selecting your OS and CPU, or use a version manager. On macOS/Linux with nvm installed, `nvm install` and `nvm use` read `.nvmrc`. On Windows, install the exact Node version or use your Windows version manager; Unix nvm commands do not apply to PowerShell. Verify `node --version` and `npm --version` before installing packages. Do not bypass `engine-strict`.

Install/start [Docker Desktop](https://docs.docker.com/compose/install/). Docker must be running, not merely installed. On Linux, install the Compose plugin and configure Docker access for your user.

## Project-local tool installation (recommended)

If you already have Node 18 or newer, Git and `tar` (included with modern Windows/macOS/Linux), the bootstrap installs the exact Node release into ignored `.tools/`, verifies its official SHA-256 checksum, and leaves system tools unchanged:

```sh
node scripts/bootstrap.mjs
```

Mobile contributors use `node scripts/bootstrap.mjs --mobile`; it also checks out Flutter at a verified commit. On bash/zsh run `source ./scripts/activate.sh` from the repository root. On PowerShell run `. ./scripts/activate.ps1`. Repeat activation in every new terminal; tools are selected only for that terminal session. If PowerShell script execution is restricted by your organization, use an approved terminal/tool installation method rather than changing machine policy.

If Node is missing, install the pinned official Node release manually first. Docker and native Android/iOS tools are separate prerequisites and are not installed by bootstrap.

## First run and daily startup

Follow the [first-time setup steps](../README.md#first-time-setup-follow-these-8-steps) once per laptop, then use [Starting work next time](../README.md#starting-work-next-time) for later sessions. Both guides include terminal activation; you must activate the project tools in each new terminal.

| Service                    | Address                                               |
| -------------------------- | ----------------------------------------------------- |
| React web app              | http://localhost:5173                                 |
| API readiness check        | http://127.0.0.1:4000/api/health                      |
| Sample menu JSON           | http://127.0.0.1:4000/api/menu                        |
| Captured development email | http://localhost:8025                                 |
| MongoDB                    | mongodb://127.0.0.1:27017, database `eisai_dev_local` |

There are no seeded accounts yet because authentication has not been implemented. Mailpit's inbox is temporary; the MongoDB volume persists when services stop.

## Dependencies and checks

Stop development processes before changing dependencies. Use `npm install <package> --workspace @eisai/web` or `--workspace @eisai/api` when deliberately adding a dependency, then commit both the package manifest and root lockfile. Do not use a second JavaScript package manager.

Before opening a PR:

```sh
npm run check
npm run test:integration
```

`check` runs lint, TypeScript checks, web/API unit tests, builds and formatting checks. Integration tests need local MongoDB; they use a unique temporary `eisai_dev_test_*` database on loopback and remove only that database afterward. They never read an Atlas URI from your `.env`.

`npm run format` fixes JS/TS/JSON/YAML/Markdown formatting. Flutter formatting is `dart format lib test` inside `apps/mobile`.

## Configuration and data isolation

- `apps/api/.env`: backend configuration. `.env.example` documents the local defaults.
- `apps/web/.env`: public browser configuration. The default `/api` uses Vite's development proxy.
- Flutter receives its public API address through `--dart-define=API_BASE_URL=...`.
- Never place MongoDB credentials, signing secrets or email-provider credentials in React/Flutter settings. Client bundles are readable by users.
- Commit examples, never `.env` files. Setup, doctor and connection errors avoid printing secret values.
- The local MongoDB volume belongs to the `eisai-dev` Compose project on that teammate's computer. It is not shared with teammates.
- Seeding requires `NODE_ENV=development`, `ALLOW_DEV_SEED=true`, and a database named `eisai_dev_<name>`. It inserts missing sample slugs, creates a uniqueness index and preserves existing menu edits. It does not drop collections or reset passwords.
- Use separate Atlas users/databases for remote development, a separate staging environment, and a separate production environment. Restrict developer users to their own databases and network access. Never use production credentials locally.

### Using Atlas instead of the local database

The final deployed course application still needs a remote MongoDB. Local Docker is an onboarding/test convenience.

After the team provisions Atlas, set `MONGODB_URI` to your privately supplied Atlas connection string and `MONGODB_DB=eisai_dev_yourname` in `apps/api/.env`. Give that database user access only to their development database. `npm run db:seed` and `npm run dev` then use Atlas. Test connectivity through `/api/health`.

Atlas provisioning, billing, network access and real email/domain setup require the account owner. They are not created by this repository. You do not need them to begin local work.

### Ports

The supported default local ports are 5173, 4000, 27017, 1025 and 8025. If a port is occupied, stop the conflicting service or deliberately change both sides of the connection. Changing `API_PORT` also requires updating the Vite proxy target in `apps/web/vite.config.ts` and mobile API URL. Changing the web origin requires updating `WEB_ORIGIN` for browser CORS. Do not silently select a random port; the web server fails clearly if 5173 is occupied.

## Flutter development

Install Flutter **3.35.7** from the [official archive](https://docs.flutter.dev/install/archive), or check out the pinned SDK tag:

```sh
git clone --depth 1 --branch 3.35.7 https://github.com/flutter/flutter.git YOUR_SDK_DIRECTORY
```

Add its `bin` directory to PATH, reopen the terminal and check `flutter --version`. `.flutter-version` is the team pin; `.fvmrc` is supplied for teammates already using FVM. Root mobile scripts use `flutter` on PATH, so ensure that resolves to the pinned SDK. The SDK belongs outside tracked source; bootstrap puts it in ignored `.tools/flutter`.

From the repository root:

```sh
npm run mobile:doctor
npm run mobile:setup
npm run mobile:check
```

`mobile:setup` enforces the committed `pubspec.lock`. `mobile:check` verifies the SDK, locked packages, analysis, tests and Flutter web compilation. It does not prove an Android/iOS build or physical-device behavior. Native toolchains are checked by `flutter doctor`; those platform prerequisites must be installed separately.

Choose a run target from `flutter devices`, keep `npm run dev` running, and use the matching API address:

| Target                           | API_BASE_URL                         |
| -------------------------------- | ------------------------------------ |
| Android emulator                 | `http://10.0.2.2:4000/api`           |
| iOS simulator on the same Mac    | `http://127.0.0.1:4000/api`          |
| Flutter web on the same computer | `http://127.0.0.1:4000/api`          |
| Physical phone                   | `http://YOUR_LAPTOP_LAN_IP:4000/api` |

```sh
npm run mobile:run -- -d YOUR_DEVICE_ID --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

For Flutter web, use a fixed port and update `WEB_ORIGIN=http://localhost:5174` in the API `.env`, then restart API:

```sh
npm run mobile:run -- -d chrome --web-port=5174 --dart-define=API_BASE_URL=http://127.0.0.1:4000/api
```

Use the React app's Vite proxy while this origin is selected; its browser requests remain same-origin. For a physical device, deliberately set `API_HOST=0.0.0.0`, use a trusted local network and allow the API port through your firewall. Revert to loopback afterward. Never expose MongoDB or Mailpit to the network. Android debug builds allow local HTTP; release builds should use HTTPS. iOS allows local networking and will request local-network access when needed.

Android developers need Android Studio/SDK tools, the required SDK platform and a compatible **JDK 17**. Accept Android SDK licenses yourself using `flutter doctor --android-licenses`. Set `JAVA_HOME` to JDK 17; if Flutter detects a different Android Studio JDK, configure its JDK path explicitly. Java 24 does not work with the pinned Gradle 8.12 wrapper. Commit the Gradle wrapper properties, but do not commit `local.properties` or SDK paths. Initial builds download platform dependencies.

iOS builds require macOS and Xcode with its platform components. Device signing and Apple account setup are separate from this scaffold; start with a simulator. App-store distribution and production signing are not configured.

## CI and reproducibility checks

GitHub Actions uses pinned Node and Flutter versions and committed lockfiles. Web/API checks and the project-local bootstrap run on Ubuntu 24.04, Windows Server 2025 and macOS 15. Explicit runner OS labels avoid automatic major-OS changes during the project. Linux integration starts the same Compose services and validates real database behavior and local SMTP. Flutter analysis/tests/web compilation and Android debug compilation run on Linux with JDK 17. These jobs require GitHub Actions availability for the private repository.

When changing SDKs/dependencies, update the version files, CI where necessary, and lockfiles in the same PR. Keep the toolchain fixed across the team until CI and a clean-clone smoke test pass.

## Troubleshooting

| Symptom                     | Resolution                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `EBADENGINE`                | Activate Node 24.21.0 and npm 11.19.0, then rerun `npm ci`.                               |
| Docker unavailable          | Start Docker Desktop; check `docker info` and `docker compose version`.                   |
| Port already allocated      | Stop the conflicting local service; see Ports above.                                      |
| API fails at startup        | Run `npm run setup`, start MongoDB, and check configuration keys without sharing secrets. |
| Empty sample menu           | Run `npm run db:seed` with the API's configured development database.                     |
| Browser works, phone fails  | Use the emulator/phone host address, not the phone's `localhost`.                         |
| Flutter version mismatch    | Put the pinned SDK first on PATH; do not run `flutter upgrade` independently.             |
| Android Java/Gradle failure | Select JDK 17 and rerun `flutter doctor -v`.                                              |
| Package lock mismatch       | Pull both manifest and lockfile changes; do not delete lockfiles to hide the mismatch.    |
