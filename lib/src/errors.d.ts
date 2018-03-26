declare class ExtendableError extends Error {
    constructor(message: any);
}
declare class AuthorizationError extends ExtendableError {
    denyType: string;
    reason: string;
    name: string;
    constructor(denyType?: string, reason?: string);
}
declare class ResolverError extends ExtendableError {
}
export { AuthorizationError, ResolverError, ExtendableError };
