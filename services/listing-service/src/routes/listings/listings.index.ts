import { createRouter } from "@/lib/create-app";

import * as handlers from "./listings.handlers";
import * as routes from "./listings.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.purchase, handlers.purchase)
  .openapi(routes.restock, handlers.restock)
  .openapi(routes.cancel, handlers.cancel);

export default router;
