const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dental Clinic API",
      version: "1.0.0",
      description: "API documentation for the dental clinic backend",
    },
    servers: [
      {
        url: "https://dental-clinic-backend-4yfs.onrender.com/", // change to your Render URL in production
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // path to your route files
};

const specs = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use("/v1/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
}

module.exports = setupSwagger;
