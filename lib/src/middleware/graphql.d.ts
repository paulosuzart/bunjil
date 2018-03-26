import { GraphQLOptions } from "apollo-server-core";
interface KoaHandler {
    (req: any, next: any): void;
}
declare function graphqlKoa(options: GraphQLOptions): KoaHandler;
export { graphqlKoa, KoaHandler };
