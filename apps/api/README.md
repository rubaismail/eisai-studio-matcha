# API (Express + MongoDB)

Runs at `http://localhost:4000/api`. Start it from the repo root with `npm run dev`.

## Where your code goes

| Folder             | Put this here                                                             | Example                 |
| ------------------ | ------------------------------------------------------------------------- | ----------------------- |
| `src/routes/`      | Which URL calls which function. Register new files in `routes/index.ts`.  | `auth.routes.ts`        |
| `src/controllers/` | What happens when a URL is hit: read the request, use a model, send JSON. | `auth.controller.ts`    |
| `src/models/`      | Mongoose schemas — the shape of each MongoDB collection.                  | `User.ts`               |
| `src/middleware/`  | Code that runs before controllers (e.g. "is this user an admin?").        | `requireAdmin.ts`       |
| `src/services/`    | Talking to outside services. Create it when you need it.                  | `email.ts`, `upload.ts` |
| `src/config/`      | Environment variables and the database connection. Rarely changes.        |                         |
| `src/scripts/`     | One-off commands like `npm run seed`.                                     |                         |
| `test/`            | Tests, named after what they test.                                        | `auth.test.ts`          |

**Adding an endpoint, step by step** (e.g. `POST /api/auth/register`):

1. Model (if new data): `src/models/User.ts`
2. Controller function: `src/controllers/auth.controller.ts`
3. Route: `src/routes/auth.routes.ts`, then add `router.use('/auth', authRoutes)` in `src/routes/index.ts`
4. Test: `test/auth.test.ts`
5. Update the SwaggerHub spec so web and mobile know the request/response shape.
