# Postman class demo

Slides 6–7 show `POST /api/menu` three ways, then clean up with `DELETE /api/menu/{id}`. It runs against a throwaway local API, so nobody needs a real admin login and nothing touches the client's database.

## Setup (about 5 minutes, once per laptop)

1. In the repository root: `npm ci` (first time only).
2. Start the demo API and leave the terminal open:

   ```sh
   npm run demo:api
   ```

   It starts the real API at `http://localhost:4000/api` on an in-memory database with three sample drinks, a demo admin and a demo customer, and prints an **admin token** (and a customer token). Tokens last 6 hours. Ctrl+C stops it and deletes everything.

   If port 4000 is busy, stop `npm run dev` first, or run `DEMO_PORT=4001 npm run demo:api` and change `baseUrl` in step 4.

3. In Postman: **Import** → [`docs/postman/Eisai-Postman-Demo.postman_collection.json`](postman/Eisai-Postman-Demo.postman_collection.json).
4. Open the collection → **Variables**: paste the admin token into `adminToken` (Current value). Leave `baseUrl` as `http://localhost:4000/api`.
5. Send the requests in order:

| # | Request | Shows | Expected |
| --- | --- | --- | --- |
| 1 | Create hidden demo drink | Admin creates a drink with `isAvailable: false`; its `_id` is saved to `demoItemId` | `201 Created` |
| 2 | Invalid price | Same request with `price: -1` | `400 Bad Request` |
| 3 | Missing authentication | Same request with no token | `401 Unauthorized` |
| 4 | Cleanup | Deletes only the drink from request 1 | `200 OK` |

Optional: put the **customer** token in request 1's Authorization tab to show `403 Forbidden` (signed in, but not an admin).

## Notes

- Don't project the terminal while it shows the tokens; switch to Postman first. They only work against this local demo API anyway.
- Never set `baseUrl` to `https://api.eisaistudio.com/api` for the demo: that would create and delete drinks in the client's live menu.
- The script is [`apps/api/test/demo/demoServer.ts`](../apps/api/test/demo/demoServer.ts). It isn't part of the production build.
- Checked on November 15, 2026: requests 1–4 returned 201, 400, 401 and 200, the customer token returned 403, and the hidden drink never appeared in `GET /api/menu`.
