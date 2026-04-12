/**
 * Point d’entrée GraphQL minimal sur `/graph` (non branché côté vitrine).
 */

import type {Request, Response} from "express";
import {buildSchema, graphql} from "graphql";

const schema = buildSchema(`
  """Requête racine (placeholder — étendre au besoin)."""
  type Query {
    """Vérification de disponibilité du endpoint GraphQL."""
    ping: String!
  }
`);

const rootValue = {
  ping: (): string => "pong",
};

/**
 * GET /graph — courte aide (sans playground lourd).
 * @param {Request} _req Requête.
 * @param {Response} res Réponse.
 * @return {Promise<void>}
 */
export async function graphQlGet(
  _req: Request,
  res: Response,
): Promise<void> {
  res.status(200).type("text/html; charset=utf-8").send(
    "<!DOCTYPE html><html lang=\"fr\"><meta charset=\"utf-8\"/>" +
      "<title>Yaayatoo GraphQL</title><body>" +
      "<p>Endpoint GraphQL (<code>POST /graph</code>) — usage futur. " +
      "Exemple : <code>{\"query\":\"{ ping }\"}</code></p>" +
      "<p>API REST recommandée pour la vitrine.</p>" +
      "</body></html>",
  );
}

/**
 * POST /graph — exécution GraphQL (corps JSON).
 * @param {Request} req Requête.
 * @param {Response} res Réponse.
 * @return {Promise<void>}
 */
export async function graphQlPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const body = req.body as {query?: string; variables?: unknown} | undefined;
    const query = typeof body?.query === "string" ? body.query : "";
    if (!query.trim()) {
      res.status(400).json({
        errors: [{message: "Champ `query` (string) requis dans le corps JSON"}],
      });
      return;
    }
    const vars = body?.variables && typeof body.variables === "object" ?
      body.variables as Record<string, unknown> :
      undefined;
    const result = await graphql({
      schema,
      source: query,
      rootValue,
      variableValues: vars,
    });
    res.status(200).json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({errors: [{message: msg}]});
  }
}
