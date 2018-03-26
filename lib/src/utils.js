"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isType(type, name, value) {
    if (typeof value === type) {
        return true;
    }
    throw new TypeError(`${name} is not of type '${type}'`);
}
exports.isType = isType;
//# sourceMappingURL=utils.js.map