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
const jwt = require("jsonwebtoken");
const index_1 = require("../../src/index");
ava_1.default("Can authenticate, and run authorized query", (t) => __awaiter(this, void 0, void 0, function* () {
    const topPostsLimit = 10;
    const jwtSecret = faker.random.uuid();
    const typeDefs = `
    type User {
      id: ID
      name: String
      email: String
      password: String
      roles: [String]
      posts(limit: Int): [Post]
    }

    type Post {
      id: ID
      title: String
      views: Int
      author: User
    }

    type LoginResponse {
      token: String
    }

    type Query {
      author(id: ID): User
      topPosts(limit: Int): [Post]
    }
    type Mutation {
      login(email: String, password: String): LoginResponse
    }
  `;
    const userId = faker.random.uuid();
    const name = faker.name.findName();
    const email = faker.internet.email();
    const password = faker.internet.password();
    const roles = [faker.commerce.department()];
    const issuer = "BunjilTest";
    const schema = graphql_tools_1.makeExecutableSchema({ typeDefs });
    graphql_tools_1.addMockFunctionsToSchema({
        schema,
        mocks: {
            Query: () => ({
                topPosts: () => new graphql_tools_1.MockList(topPostsLimit),
            }),
            Mutation: () => ({
                login: (root, args, context, info) => {
                    if (args.email === email && args.password === password) {
                        return {
                            token: jwt.sign({ email, roles, name, userId }, jwtSecret, {
                                issuer,
                            }),
                        };
                    }
                },
            }),
            User: () => ({
                id: userId,
                name,
                email,
                password,
                roles,
            }),
        },
    });
    const authenticationMiddleware = (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        if (ctx &&
            ctx.request &&
            ctx.request.header &&
            ctx.request.header.authorization) {
            const decoded = jwt.verify(ctx.request.header.authorization.replace("Bearer: ", ""), jwtSecret, {
                issuer,
            });
            ctx.user = Object.assign({}, decoded);
        }
        yield next();
    });
    const policies = [
        {
            id: faker.random.uuid(),
            resources: [
                "Query::topPosts",
                "Query::author",
                "Post::*",
                "User::*",
            ],
            actions: ["query"],
            effect: index_1.PolicyEffect.Allow,
            roles,
        },
        {
            id: faker.random.uuid(),
            resources: ["Mutation::login", "LoginResponse::token"],
            actions: ["mutation"],
            effect: index_1.PolicyEffect.Allow,
            roles: ["anonymous"],
        },
        {
            id: faker.random.uuid(),
            resources: ["User::password"],
            actions: ["query"],
            effect: index_1.PolicyEffect.Deny,
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
        debug: false,
        endpoints,
        policies,
        hooks: {
            authentication: authenticationMiddleware,
        },
    });
    bunjil.addSchema({ schemas: [schema] });
    yield bunjil.start();
    const server = yield request(bunjil.koa.callback());
    const login = yield server.post(endpoints.graphQL).send({
        query: `
          mutation login {
            login(email: "${email}", password: "${password}") {
              token
            }
          }
      `,
    });
    t.is(login.status, 200);
    t.notDeepEqual(login.body.data, {
        login: null,
    });
    t.is(login.body.data.errors, undefined);
    if (login.body.data.login) {
        t.true(typeof login.body.data.login.token === "string");
    }
    const authorizationToken = login.body.data.login.token;
    const topPosts = yield server
        .post(endpoints.graphQL)
        .set("Authorization", `Bearer: ${authorizationToken}`)
        .send({
        query: `
            query topPosts {
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
    t.is(topPosts.status, 200);
    t.notDeepEqual(topPosts.body.data, {
        topPosts: null,
    });
    t.is(topPosts.body.data.errors, undefined);
    if (topPosts.body.data.topPosts) {
        t.is(topPosts.body.data.topPosts.length, topPostsLimit);
    }
    const passwordRequest = yield server
        .post(endpoints.graphQL)
        .set("Authorization", `Bearer: ${authorizationToken}`)
        .send({
        query: `
            query author {
              author(id: "${userId}") {
                id
                name
                email
                roles
                password
              }
            }
        `,
    });
    t.is(passwordRequest.status, 200);
    t.deepEqual(passwordRequest.body.data, {
        author: {
            id: userId,
            name,
            email,
            roles,
            password: null,
        },
    });
}));
ava_1.default("Restrict access to a type based on userId", (t) => __awaiter(this, void 0, void 0, function* () {
    const jwtSecret = faker.random.uuid();
    const typeDefs = `
  type User {
    id: ID
    name: String
    email: String
    password: String
    roles: [String]
  }

  type LoginResponse {
    token: String
  }

  type Query {
    User(id: ID): User
  }
  type Mutation {
    login(email: String, password: String): LoginResponse
    updatePassword(id: ID, password: String): User
  }
`;
    const userId = faker.random.uuid();
    const name = faker.name.findName();
    const email = faker.internet.email();
    const password = faker.internet.password();
    const roles = [faker.commerce.department()];
    const issuer = "BunjilTest";
    const schema = graphql_tools_1.makeExecutableSchema({ typeDefs });
    graphql_tools_1.addMockFunctionsToSchema({
        schema,
        mocks: {
            Query: () => ({
                employeeSalary: (employeeId) => { },
            }),
            Mutation: () => ({
                login: (root, args, context, info) => {
                    if (args.email === email && args.password === password) {
                        return {
                            token: jwt.sign({ email, roles, name, userId }, jwtSecret, {
                                issuer,
                            }),
                        };
                    }
                },
            }),
            User: (root, args, context, info) => {
                if (args.id === userId) {
                    return {
                        id: userId,
                        name,
                        email,
                        password,
                        roles,
                    };
                }
                else {
                    return {
                        id: args.id,
                        name: faker.name.findName(),
                        email: faker.internet.email(),
                        password: faker.internet.password(),
                        roles: [faker.commerce.department()],
                    };
                }
            },
        },
    });
    const authenticationMiddleware = (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        if (ctx &&
            ctx.request &&
            ctx.request.header &&
            ctx.request.header.authorization) {
            const decoded = jwt.verify(ctx.request.header.authorization.replace("Bearer: ", ""), jwtSecret, {
                issuer,
            });
            ctx.user = Object.assign({}, decoded);
        }
        yield next();
    });
    const policies = [
        {
            id: faker.random.uuid(),
            resources: ["Query::*", "User::*"],
            actions: ["query", "mutation"],
            effect: index_1.PolicyEffect.Allow,
            roles,
        },
        {
            id: faker.random.uuid(),
            resources: ["Mutation::login", "LoginResponse::token"],
            actions: ["mutation"],
            effect: index_1.PolicyEffect.Allow,
            roles: ["anonymous"],
        },
        {
            id: faker.random.uuid(),
            resources: ["User::password"],
            actions: ["*"],
            effect: index_1.PolicyEffect.Deny,
            roles: ["*"],
        },
        {
            id: faker.random.uuid(),
            resources: ["User::*"],
            actions: ["*"],
            effect: index_1.PolicyEffect.Deny,
            roles: ["*"],
            conditions: [
                {
                    field: "user.userId",
                    operator: index_1.PolicyOperator.notMatch,
                    expectedOnContext: ["root.id"],
                },
            ],
        },
        {
            id: faker.random.uuid(),
            resources: ["Mutation::updatePassword"],
            actions: ["mutation"],
            effect: index_1.PolicyEffect.Allow,
            roles: ["*"],
            conditions: [
                {
                    field: "user.userId",
                    operator: index_1.PolicyOperator.match,
                    expectedOnContext: ["args.id"],
                },
            ],
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
        debug: false,
        endpoints,
        policies,
        hooks: {
            authentication: authenticationMiddleware,
        },
    });
    bunjil.addSchema({ schemas: [schema] });
    yield bunjil.start();
    const server = yield request(bunjil.koa.callback());
    const login = yield server.post(endpoints.graphQL).send({
        query: `
        mutation login {
          login(email: "${email}", password: "${password}") {
            token
          }
        }
    `,
    });
    t.is(login.status, 200);
    t.notDeepEqual(login.body.data, {
        login: null,
    });
    t.is(login.body.data.errors, undefined);
    if (login.body.data.login) {
        t.true(typeof login.body.data.login.token === "string");
    }
    const authorizationToken = login.body.data.login.token;
    const getCurrentUser = yield server
        .post(endpoints.graphQL)
        .set("Authorization", `Bearer: ${authorizationToken}`)
        .send({
        query: `
          query user {
            User(id: "${userId}") {
                id
                name
                email
            }
          }
      `,
    });
    t.is(getCurrentUser.status, 200);
    t.deepEqual(getCurrentUser.body.data, {
        User: {
            id: userId,
            name: name,
            email: email,
        },
    });
    const getAnotherUser = yield server
        .post(endpoints.graphQL)
        .set("Authorization", `Bearer: ${authorizationToken}`)
        .send({
        query: `
          query user {
            User(id: "${faker.random.uuid()}") {
                id
                name
                email
            }
          }
      `,
    });
    t.is(getAnotherUser.status, 200);
    const updateMyPassword = yield server
        .post(endpoints.graphQL)
        .set("Authorization", `Bearer: ${authorizationToken}`)
        .send({
        query: `
              mutation updateMyPassword {
                updatePassword(id: "${userId}", password: "${password}") {
                    id
                    name
                    email
                }
              }
          `,
    });
    t.is(updateMyPassword.status, 200);
    const updateSomeoneElsesPassword = yield server
        .post(endpoints.graphQL)
        .set("Authorization", `Bearer: ${authorizationToken}`)
        .send({
        query: `
              mutation updateMyPassword {
                updatePassword(id: "${faker.random.uuid()}", password: "${password}") {
                    id
                    name
                    email
                }
              }
          `,
    });
    t.is(updateSomeoneElsesPassword.status, 200);
}));
//# sourceMappingURL=authorization.spec.js.map