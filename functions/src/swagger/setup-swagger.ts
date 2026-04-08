import type {Express, Request, Response} from "express";
import swaggerUi from "swagger-ui-express";
import {openApiSpec} from "./openapi-spec.js";

/**
 * Monte Swagger UI et l’export JSON OpenAPI sur l’app Express.
 * @param {Express} app Application Express.
 */
export function mountSwagger(app: Express): void {
  app.get("/openapi.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(openApiSpec);
  });

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "Yaayatoo API",
      customCss:
        ".swagger-ui .topbar { display: none }",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    }),
  );
}
