import { GraphQLEnumValue } from "graphql";
import { SchemaDirectiveVisitor } from "graphql-tools";
declare class CacheControlDirective extends SchemaDirectiveVisitor {
    visitEnumValue(value: GraphQLEnumValue): void;
}
export { CacheControlDirective };
