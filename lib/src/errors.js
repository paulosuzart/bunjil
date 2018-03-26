"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ExtendableError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.stack = new Error(message).stack;
    }
}
exports.ExtendableError = ExtendableError;
class AuthorizationError extends ExtendableError {
    constructor(denyType = "Denied", reason = "Access Denied") {
        super(reason);
        this.denyType = denyType;
        this.reason = reason;
        this.name = "AuthorizationError";
        this.reason = reason;
        this.denyType = denyType;
    }
}
exports.AuthorizationError = AuthorizationError;
class ResolverError extends ExtendableError {
}
exports.ResolverError = ResolverError;
//# sourceMappingURL=errors.js.map