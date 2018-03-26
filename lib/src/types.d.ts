/// <reference types="koa" />
import * as Koa from "koa";
import { Policy, PolicyEffect, PolicyCondition, PolicyOperator } from "wahn";
import { GraphQLNamedType } from "graphql";
import { GraphQLConfigData } from "graphql-config";
interface OnTypeConflictCallback {
    (left: GraphQLNamedType, right: GraphQLNamedType): GraphQLNamedType;
}
declare type playgroundOptions = {
    enabled: boolean;
    endpoint?: string;
    subscriptionsEndpoint?: string;
    htmlTitle?: string;
    workspaceName?: string;
    env?: any;
    config?: GraphQLConfigData;
    settings?: PlaygroundSettings;
};
declare type playgroundTheme = "dark" | "light";
interface PlaygroundSettings {
    ["general.betaUpdates"]: boolean;
    ["editor.theme"]: playgroundTheme;
    ["editor.reuseHeaders"]: boolean;
    ["tracing.hideTracingResponse"]: boolean;
}
declare type BunjilOptions = {
    debug?: boolean;
    playgroundOptions: playgroundOptions;
    server: {
        port?: number;
        tracing?: boolean | undefined;
        cacheControl?: boolean | undefined;
        disableBunjilCache?: boolean | undefined;
        useApolloCache?: boolean | undefined;
        useApolloTracing?: boolean | undefined;
    };
    endpoints: {
        graphQL: string | undefined;
        subscriptions: string | undefined;
        playground: string | undefined;
    };
    policies: Policy[];
    hooks?: {
        authentication?: AuthenticationMiddleware;
        authorization?: AuthorizationCallback;
    };
};
interface AuthenticationMiddleware {
    (ctx: Koa.Context, next: () => Promise<any>): Promise<any>;
}
declare type AuthorizationCallbackOptions = {
    action: string;
    resource: string;
    context: any;
};
interface AuthorizationCallback {
    (AuthorizationCallbackOptions: any): boolean;
}
export { BunjilOptions, AuthenticationMiddleware, AuthorizationCallback, AuthorizationCallbackOptions, playgroundOptions, playgroundTheme, PlaygroundSettings, Policy, PolicyEffect, PolicyOperator, PolicyCondition, OnTypeConflictCallback };
