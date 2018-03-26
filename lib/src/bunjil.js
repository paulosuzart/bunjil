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
const prisma_binding_1 = require("prisma-binding");
const koaCompress = require("koa-compress");
const graphql_add_middleware_1 = require("graphql-add-middleware");
const debug = require("debug");
const hash = require("object-hash");
const graphql_tools_1 = require("graphql-tools");
const Koa = require("koa");
const KoaRouter = require("koa-router");
const KoaBody = require("koa-bodyparser");
const graphql_playground_middleware_koa_1 = require("graphql-playground-middleware-koa");
const winston = require("winston");
const wahn_1 = require("wahn");
const errors_1 = require("./errors");
const graphql_1 = require("./middleware/graphql");
const cache_1 = require("./cache");
const info = debug("bunjil:info");
const log = debug("bunjil:log");
const warn = debug("bunjil:warn");
class Bunjil {
    constructor(options) {
        this.debug = false;
        this.playgroundOptions = {
            enabled: false,
        };
        if (options.debug) {
            this.debug = options.debug;
        }
        this.logger = new winston.Logger({
            level: "info",
            transports: this.debug === true ? [new winston.transports.Console()] : [],
        });
        this.playgroundOptions = options.playgroundOptions;
        if (typeof options.endpoints !== "undefined" &&
            typeof options.endpoints.graphQL === "string") {
            this.endpoints = Object.assign({}, options.endpoints, { graphQL: options.endpoints.graphQL });
        }
        else {
            throw new Error("options.endpoints.graphQL is required");
        }
        this.koa = new Koa();
        this.router = new KoaRouter();
        this.serverConfig = Object.assign({}, options.server, { tracing: typeof options.server.tracing === "boolean"
                ? options.server.tracing
                : false, cacheControl: typeof options.server.cacheControl === "boolean"
                ? options.server.cacheControl
                : false, disableBunjilCache: typeof options.server.disableBunjilCache === "boolean"
                ? options.server.disableBunjilCache
                : false, useApolloCache: typeof options.server.useApolloCache === "boolean"
                ? options.server.useApolloCache
                : false, useApolloTracing: typeof options.server.useApolloTracing === "boolean"
                ? options.server.useApolloTracing
                : false });
        if (options.server.port) {
            this.serverConfig.port = Number(options.server.port);
        }
        this.graphQL = {
            context: {},
            typeDefs: undefined,
            schema: undefined,
            resolvers: {
                Query: {},
                Mutation: {},
                Subscription: {},
            },
        };
        if (typeof options.hooks !== "undefined") {
            if (typeof options.hooks.authentication === "function") {
                this.authenticationMiddleware = options.hooks.authentication;
            }
            if (typeof options.hooks.authorization === "function") {
                this.authorizationCallback = options.hooks.authorization;
            }
        }
        if (Array.isArray(options.policies)) {
            this.wahn = new wahn_1.Wahn({
                policies: options.policies,
            });
        }
        if (this.serverConfig.cacheControl === true &&
            this.serverConfig.disableBunjilCache === false) {
            this.cache = new cache_1.Cache();
        }
    }
    resolverHook(root, args, context, info, next) {
        return __awaiter(this, void 0, void 0, function* () {
            let resource = `${info.parentType.name}:`;
            resource = `${resource}:${info.fieldName}`;
            const action = info.operation.operation;
            try {
                const authorization = this.authorizationCallback({
                    action,
                    resource,
                    context: Object.assign({}, context, { root,
                        args }),
                });
                if (authorization === true) {
                    let cacheKey = undefined;
                    let cacheTTL = undefined;
                    if (action === "query" &&
                        this.cache &&
                        info &&
                        info.cacheControl &&
                        info.cacheControl.cacheHint &&
                        info.cacheControl.cacheHint.maxAge) {
                        cacheKey = `${hash(resource)}:${hash(args)}`;
                        if (info.cacheControl.cacheHint.scope &&
                            info.cacheControl.cacheHint.scope === "PRIVATE" &&
                            context.user.id !== null) {
                            cacheKey = `${cacheKey}:${context.user.id}`;
                        }
                        cacheTTL = info.cacheControl.cacheHint.maxAge;
                        try {
                            const cachedResult = this.cache.get(cacheKey);
                            if (typeof cachedResult !== "undefined") {
                                return cachedResult;
                            }
                        }
                        catch (cacheErr) {
                            debug(cacheErr);
                        }
                    }
                    const result = yield next();
                    if (action === "query" &&
                        this.cache &&
                        typeof cacheKey === "string" &&
                        typeof cacheTTL === "number") {
                        this.cache.set(cacheKey, result, cacheTTL);
                    }
                    return result;
                }
                throw new errors_1.AuthorizationError("access-denied", "Access Denied");
            }
            catch (err) {
                if (this.debug) {
                    debug(`bunjil::resolverHook: ${err.message}, ${err.stack}`);
                }
                throw new errors_1.AuthorizationError(err.denyType ? err.denyType : "access-denied", "Access Denied");
            }
        });
    }
    finaliseResolvers() {
        if (typeof this.graphQL.schema === "undefined") {
            throw new Error("Cannot start GraphQL server, schema is undefined");
        }
        graphql_add_middleware_1.addMiddleware(this.graphQL.schema, this.resolverHook.bind(this));
    }
    finaliseGraphqlRoutes() {
        if (typeof this.graphQL.schema === "undefined") {
            throw new Error("Cannot start GraphQL server, schema is undefined");
        }
        this.finaliseResolvers();
        this.router.post(this.endpoints.graphQL, this.sanitiseMiddleware.bind(this), (ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.user = { id: null, roles: ["anonymous"] };
            yield next();
        }), this.authenticationMiddleware.bind(this), graphql_1.graphqlKoa({
            schema: this.graphQL.schema,
            debug: this.debug,
            cacheControl: this.serverConfig.cacheControl,
            context: Object.assign({}, this.graphQL.context),
        }));
        this.router.get(this.endpoints.graphQL, graphql_1.graphqlKoa({
            schema: this.graphQL.schema,
            debug: this.debug,
            tracing: true,
        }));
        if (this.playgroundOptions.enabled) {
            const playgroundOptions = Object.assign({}, this.playgroundOptions, { endpoint: this.endpoints.graphQL });
            this.router.get(this.endpoints.playground, graphql_playground_middleware_koa_1.default(playgroundOptions));
        }
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            this.koa.on("log", this.logger.info);
            this.logger.debug("Finalising GraphQL routes");
            this.finaliseGraphqlRoutes();
            this.koa.use(KoaBody());
            this.koa.use(koaCompress());
            this.koa.use(this.router.routes());
            this.koa.use(this.router.allowedMethods());
            this.logger.debug("Starting Koa");
            this.koa.listen(this.serverConfig.port);
            this.logger.debug(`Bunjil running at port ${this.serverConfig.port}`);
        });
    }
    addForwardedResolver(resolver, forwardToKey) {
        return prisma_binding_1.forwardTo(forwardToKey);
    }
    addPrismaSchema({ typeDefs, prisma, contextKey, }) {
        let prismaContextKey = "prisma";
        if (typeof contextKey === "string") {
            prismaContextKey = contextKey;
        }
        const queryResolvers = Object.keys(prisma.query).reduce((accumulator, current) => {
            accumulator[current] = this.addForwardedResolver(current, prismaContextKey);
            return accumulator;
        }, {});
        const mutationResolvers = Object.keys(prisma.mutation).reduce((accumulator, current) => {
            accumulator[current] = this.addForwardedResolver(current, prismaContextKey);
            return accumulator;
        }, {});
        const subscriptionResolvers = Object.keys(prisma.subscription).reduce((accumulator, current) => {
            accumulator[current] = this.addForwardedResolver(current, prismaContextKey);
            return accumulator;
        }, {});
        const resolvers = {
            Query: Object.assign({}, queryResolvers),
            Mutation: Object.assign({}, mutationResolvers),
            Subscription: Object.assign({}, subscriptionResolvers),
        };
        const schema = graphql_tools_1.makeExecutableSchema({
            typeDefs: [typeDefs],
            resolvers,
        });
        this.addSchema({ schemas: [schema] });
        this.logger.debug("Added Prisma schema");
        this.addContext(prismaContextKey, prisma);
    }
    addSchema({ schemas, onTypeConflict, resolvers, }) {
        let onTypeConflictCallback = (left, right) => {
            return right;
        };
        if (typeof onTypeConflict !== "undefined") {
            onTypeConflictCallback = onTypeConflictCallback;
        }
        let schemasToMerge;
        if (typeof this.graphQL.schema === "undefined") {
            this.logger.debug("Added initial schema.");
            schemasToMerge = schemas;
        }
        else {
            this.logger.debug("Merging additional schema.");
            schemasToMerge = [this.graphQL.schema, ...schemas];
        }
        this.graphQL.schema = graphql_tools_1.mergeSchemas({
            schemas: schemasToMerge,
            onTypeConflict: onTypeConflictCallback,
        });
    }
    addContext(key, value) {
        this.logger.debug(`Added '${key}' to GraphQL context.`);
        this.graphQL.context = Object.assign({}, this.graphQL.context, { [key]: value });
    }
    authenticationMiddleware(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            yield next();
        });
    }
    authorizationCallback({ action, resource, context, }) {
        log("authorizationCallback", {
            action,
            resource,
            context,
        });
        try {
            if (this.wahn instanceof wahn_1.Wahn) {
                const authorization = this.wahn.evaluateAccess({
                    context,
                    action,
                    resource,
                });
                if (this.debug) {
                    debug(JSON.stringify({
                        type: "authorizationCallback",
                        action,
                        resource,
                        authorization,
                        user: context.user,
                        context,
                    }, null, 4));
                }
                return authorization;
            }
            throw Error("Error: no policies.");
        }
        catch (err) {
            if (this.debug) {
                warn(err.message, err.stack);
            }
            throw err;
        }
    }
    sanitiseMiddleware(ctx, next) {
        return __awaiter(this, void 0, void 0, function* () {
            yield next();
            if (this.serverConfig.useApolloCache === false ||
                this.serverConfig.useApolloTracing === false) {
                const body = JSON.parse(ctx.response.body);
                const sanitisedBody = {
                    data: body.data,
                    errors: body.errors,
                    extensions: Object.assign({}, body.extensions, { cacheControl: this.serverConfig.useApolloCache
                            ? body.extensions.cacheControl
                            : undefined, tracing: this.serverConfig.useApolloTracing
                            ? body.extensions.tracing
                            : undefined }),
                };
                ctx.body = JSON.stringify(sanitisedBody);
            }
        });
    }
}
exports.Bunjil = Bunjil;
//# sourceMappingURL=bunjil.js.map