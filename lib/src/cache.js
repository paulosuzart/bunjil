"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NodeCache = require("node-cache");
class Cache {
    constructor(maxTTL = 86000, checkperiod = 5) {
        this.cache = new NodeCache({
            stdTTL: maxTTL,
            errorOnMissing: false,
            checkperiod,
            useClones: true,
        });
    }
    set(key, value, ttl) {
        return this.cache.set(key, value, ttl);
    }
    get(key) {
        return this.cache.get(key);
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map