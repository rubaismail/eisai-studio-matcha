# Diagrams

Each diagram has an editable PlantUML source (`.puml`) and an exported image (`.png`). Edit the `.puml` file, then export the image again so the two match.

| Diagram | Source | Image | Shows |
| --- | --- | --- | --- |
| Entity relationship (ERD) | [erd.puml](erd.puml) | [erd.png](erd.png) | MongoDB `User` and `MenuItem` collections |
| Flutter class diagram | [mobile-class.puml](mobile-class.puml) | [mobile-class.png](mobile-class.png) | Mobile app screens, services and models |
| Use cases | [use-case.puml](use-case.puml) | [use-case.png](use-case.png) | What visitors, customers and admins can do on the website and app |
| Sequence: log in and call a protected route | [sequence-login.puml](sequence-login.puml) | [sequence-login.png](sequence-login.png) | `POST /api/auth/login`, JWT, `requireAuth` and `requireAdmin` |
| Sequence: admin edits a menu item and photo | [sequence-admin-edit-menu.puml](sequence-admin-edit-menu.puml) | [sequence-admin-edit-menu.png](sequence-admin-edit-menu.png) | `POST /api/uploads` to S3, then `PUT /api/menu/{id}` |
| Activity: create account and verify email | [activity-register-verify.puml](activity-register-verify.puml) | [activity-register-verify.png](activity-register-verify.png) | Register, verification email, resend, verify, log in |

The sequence and activity diagrams follow the code in `apps/api/src` (routes, controllers and middleware) as of November 15, 2026. Endpoint details are in [the API docs](../api/README.md).

## Exporting images

With Java installed, from the repository root:

```sh
java -jar plantuml.jar -Playout=smetana -tpng docs/diagrams/*.puml
```

`-Playout=smetana` uses PlantUML's built-in layout, so Graphviz doesn't need to be installed. Without it, the ERD, class and use-case diagrams need Graphviz (`brew install graphviz`). The new images were exported with PlantUML 1.2024.7.

Get `plantuml.jar` from [plantuml.com/download](https://plantuml.com/download). The VS Code "PlantUML" extension can also preview and export.
