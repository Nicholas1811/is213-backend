import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";
import { createRouter } from "@/lib/create-app";

// Flow for implementing routes
// 1. Define contract
// 2. Define implementation

const router = createRouter()
  .openapi(
    createRoute({
      tags: ["Index"],
      method: "get",
      path: "/",
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          createMessageObjectSchema("Listings API"),
          "Listing API Index",
        ),
      },
    }),
    (c) => {
      return c.json({
        message: "Listings API",
      }, HttpStatusCodes.OK);
    },
  );

export default router;
