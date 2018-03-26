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
require("apollo-cache-control");
const request = require("supertest");
const index_1 = require("../../src/index");
ava_1.default("Can cache top level queries", (t) => __awaiter(this, void 0, void 0, function* () {
    const topPostsLimit = 10;
    const typeDefs = `
      type User {
        id: ID
        name: String
        password: String
        posts(limit: Int): [Post]
      }

      type Post {
        id: ID
        title: String
        views: Int
        author: User
      }

      type Query {
        author(id: ID): User
        topPosts(limit: Int): [Post] @cacheControl(maxAge: 3000)
      }
    `;
    const schema = graphql_tools_1.makeExecutableSchema({ typeDefs });
    graphql_tools_1.addMockFunctionsToSchema({
        schema,
        mocks: {
            Query: () => ({
                topPosts: () => new graphql_tools_1.MockList(topPostsLimit),
            }),
        },
    });
    const policies = [
        {
            id: faker.random.uuid(),
            resources: ["Query::topPosts", "Post::*", "User::*"],
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
            cacheControl: true,
        },
        playgroundOptions: {
            enabled: false,
        },
        debug: true,
        endpoints,
        policies,
    });
    bunjil.addSchema({ schemas: [schema] });
    yield bunjil.start();
    const server = yield request(bunjil.koa.callback());
    const res = yield server.post(endpoints.graphQL).send({
        query: `
              query getTopPosts {
                topPosts(limit: ${topPostsLimit}) {
                  id
                  title
                  views
                  author {
                    id
                    name
                  }
                }
              }
          `,
    });
    t.is(res.status, 200);
    t.notDeepEqual(res.body.data, {
        topPosts: null,
    });
    t.is(res.body.data.errors, undefined);
    t.is(res.body.data.topPosts.length, topPostsLimit);
    const res2 = yield server.post(endpoints.graphQL).send({
        query: `
              query getTopPosts {
                topPosts(limit: ${topPostsLimit}) {
                  id
                  title
                  views
                  author {
                    id
                    name
                  }
                }
              }
          `,
    });
    t.deepEqual(res.body.data, res2.body.data);
}));
ava_1.default("Can cache individual fields", (t) => __awaiter(this, void 0, void 0, function* () {
    const topPostsLimit = 1;
    const typeDefs = `
    type User {
      id: ID @cacheControl(maxAge: 500)
      name: String @cacheControl(maxAge: 500)
      password: String
      posts(limit: Int): [Post]
    }

    type Post {
      id: ID @cacheControl(maxAge: 500)
      title: String @cacheControl(maxAge: 500)
      views: Int @cacheControl(maxAge: 500)
      author: User
    }

    type Query {
      author(id: ID): User
      topPosts(limit: Int): [Post]
    }
  `;
    const schema = graphql_tools_1.makeExecutableSchema({ typeDefs });
    graphql_tools_1.addMockFunctionsToSchema({
        schema,
        mocks: {
            Query: () => ({
                topPosts: () => new graphql_tools_1.MockList(topPostsLimit),
            }),
        },
    });
    const policies = [
        {
            id: faker.random.uuid(),
            resources: ["Query::topPosts", "Post::*", "User::*"],
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
            cacheControl: true,
        },
        playgroundOptions: {
            enabled: false,
        },
        debug: true,
        endpoints,
        policies,
    });
    bunjil.addSchema({ schemas: [schema] });
    yield bunjil.start();
    const server = yield request(bunjil.koa.callback());
    const res = yield server.post(endpoints.graphQL).send({
        query: `
            query getTopPosts {
              topPosts(limit: ${topPostsLimit}) {
                id
                title
                views
                author {
                  id
                  name
                }
              }
            }
        `,
    });
    t.is(res.status, 200);
    t.notDeepEqual(res.body.data, {
        topPosts: null,
    });
    t.is(res.body.data.errors, undefined);
    t.is(res.body.data.topPosts.length, topPostsLimit);
    const res2 = yield server.post(endpoints.graphQL).send({
        query: `
            query getTopPosts {
              topPosts(limit: ${topPostsLimit}) {
                id
                title
                views
                author {
                  id
                  name
                }
              }
            }
        `,
    });
    t.deepEqual(res.body.data, res2.body.data);
}));
//# sourceMappingURL=cacheControl.spec.js.map