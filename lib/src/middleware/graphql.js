"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_core_1 = require("apollo-server-core");
function graphqlKoa(options) {
    if (!options) {
        throw new Error("Apollo Server requires options.");
    }
    if (arguments.length > 1) {
        throw new Error(`Apollo Server expects exactly one argument, got ${arguments.length}`);
    }
    return (ctx) => {
        let serverOptions = Object.assign({}, options, { schema: options.schema });
        if (ctx.user) {
            serverOptions.context = Object.assign({}, serverOptions.context, { user: Object.assign({}, ctx.user), request: ctx.request });
        }
        return apollo_server_core_1.runHttpQuery([ctx], {
            method: ctx.request.method,
            options: serverOptions,
            query: ctx.request.method === "POST"
                ? ctx.request.body
                : ctx.request.query,
        }).then(gqlResponse => {
            ctx.set("Content-Type", "application/json");
            ctx.body = gqlResponse;
        }, (error) => {
            if ("HttpQueryError" !== error.name) {
                throw error;
            }
            if (error.headers) {
                Object.keys(error.headers).forEach(header => {
                    ctx.set(header, error.headers[header]);
                });
            }
            ctx.status = error.statusCode;
            ctx.body = error.message;
        });
    };
}
exports.graphqlKoa = graphqlKoa;
//# sourceMappingURL=graphql.js.map