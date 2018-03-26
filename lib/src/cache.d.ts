declare class Cache {
    private cache;
    constructor(maxTTL?: number, checkperiod?: number);
    set(key: string, value: any, ttl: number): any;
    get(key: string): any | undefined;
}
export { Cache };
