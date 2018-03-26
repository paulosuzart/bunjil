/// <reference types="koa" />
import { GraphQLSchema } from "graphql";
import { Prisma } from "prisma-binding";
import { IResolvers, MergeInfo, UnitOrList } from "graphql-tools/dist/Interfaces";
import * as Koa from "koa";
import { BunjilOptions, AuthorizationCallbackOptions, playgroundOptions, OnTypeConflictCallback } from "./types";
declare class Bunjil {
    private debug;
    private logger;
    playgroundOptions: playgroundOptions;
    koa: Koa;
    private router;
    serverConfig: {
        port?: number;
        tracing: boolean;
        cacheControl: boolean;
        disableBunjilCache: boolean;
        useApolloCache: boolean;
        useApolloTracing: boolean;
    };
    endpoints: {
        graphQL: string;
        subscriptions: string | undefined;
        playground: string | undefined;
    };
    private graphQL;
    private wahn;
    private cache;
    constructor(options: BunjilOptions);
    private resolverHook(root, args, context, info, next);
    private finaliseResolvers();
    private finaliseGraphqlRoutes();
    start(): Promise<void>;
    private addForwardedResolver(resolver, forwardToKey);
    addPrismaSchema({typeDefs, prisma, contextKey}: {
        typeDefs: string;
        prisma: Prisma | any;
        contextKey?: string | undefined;
    }): void;
    addSchema({schemas, onTypeConflict, resolvers}: {
        schemas: (GraphQLSchema | string)[];
        onTypeConflict?: OnTypeConflictCallback | undefined;
        resolvers?: UnitOrList<IResolvers | ((mergeInfo: MergeInfo) => IResolvers)>;
    }): void;
    addContext(key: string, value: any): void;
    authenticationMiddleware(ctx: Koa.Context, next: () => Promise<any>): Promise<any>;
    authorizationCallback({action, resource, context}: AuthorizationCallbackOptions): boolean;
    private sanitiseMiddleware(ctx, next);
}
export { Bunjil, BunjilOptions };
