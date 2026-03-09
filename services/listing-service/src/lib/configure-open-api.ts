import type { AppOpenAPI } from "./types";
import { Scalar } from "@scalar/hono-api-reference";
import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "Listings API",
    },
  });

  app.get("/reference", Scalar({
    url: "/doc",
    theme: "deepSpace",
    layout: "classic",
    defaultHttpClient: {
      targetKey: "js",
      clientKey: "fetch",
    },
  }));
}
