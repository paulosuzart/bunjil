"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const faker = require("faker");
const graphql_tools_1 = require("graphql-tools");
const request = require("supertest");
const index_1 = require("../../src/index");
ava_1.default("Can merge schemas, and mask a type", (t) => __awaiter(this, void 0, void 0, function* () {
    const topPostsLimit = 10;
    const typeDefs = `
      type User {
        id: ID
        name: String
        email: String
        password: String
      }

      type Query {
        User(id: ID): User
      }
    `;
    const schema = graphql_tools_1.makeExecutableSchema({ typeDefs });
    graphql_tools_1.addMockFunctionsToSchema({
        schema,
        mocks: {
            Query: () => ({
                User: () => ({
                    id: faker.random.uuid(),
                    name: faker.name.findName(),
                    email: faker.internet.email(),
                    password: faker.internet.password(),
                }),
            }),
        },
    });
    const policies = [
        {
            id: faker.random.uuid(),
            resources: ["Query::User", "User::*"],
            actions: ["query"],
            effect: index_1.PolicyEffect.Allow,
            roles: ["*"],
        },
    ];
    const endpoints = {
        graphQL: "/graphql",
        subscriptions: "/graphql/subscriptions",
        playground: "/playground",
    };
    const bunjil = new index_1.Bunjil({
        server: {
            tracing: false,
            cacheControl: false,
        },
        playgroundOptions: {
            enabled: false,
        },
        endpoints,
        policies,
    });
    bunjil.addSchema({ schemas: [schema] });
    const maskingTypeDefs = `
      type User {
        id: ID
        name: String
        email: String
      }
      type Query {
        User(id: ID): User
      }

    `;
    const maskingSchema = graphql_tools_1.makeExecutableSchema({ typeDefs: maskingTypeDefs });
    graphql_tools_1.addMockFunctionsToSchema({
        schema: maskingSchema,
        mocks: {
            Query: () => ({
                User: () => ({
                    id: faker.random.uuid(),
                    name: faker.name.findName(),
                    email: faker.internet.email(),
                }),
            }),
        },
    });
    bunjil.addSchema({ schemas: [maskingSchema] });
    yield bunjil.start();
    const res = yield request(bunjil.koa.callback())
        .post(endpoints.graphQL)
        .send({
        query: `
              query getUser {
                User {
                  id
                  name
                  email
                  password
                }
              }
          `,
    });
    t.is(res.status, 400);
    t.false(typeof res !== "undefined" &&
        typeof res.body !== "undefined" &&
        typeof res.body.User !== "undefined" &&
        typeof res.body.data.User.password === "string", "Masking failed, password field exists");
}));
//# sourceMappingURL=schemaMerging.spec.js.map