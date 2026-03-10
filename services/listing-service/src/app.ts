import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import index from "@/routes/index.route";
import listings from "@/routes/listings/listings.index";

const app = createApp();

const routes = [
  index,
  listings,
];

configureOpenAPI(app);

routes.forEach((route) => {
  app.route("/", route);
});

export default app;
