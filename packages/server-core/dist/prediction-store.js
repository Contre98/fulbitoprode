const predictionStore = {
    fecha14: {
        public: {}
    },
    fecha15: {
        public: {}
    }
};
function toScopeKey(scope) {
    const user = scope?.userId?.trim() || "anon";
    const group = scope?.groupId?.trim() || "default";
    if (user === "anon" && group === "default") {
        return "public";
    }
    return `${user}:${group}`;
}
function getScopeStore(period, scope) {
    const key = toScopeKey(scope);
    if (!predictionStore[period][key]) {
        predictionStore[period][key] = {};
    }
    return predictionStore[period][key];
}
export function ensurePrediction(period, matchId, initial = { home: null, away: null }, scope) {
    const scopedStore = getScopeStore(period, scope);
    if (!scopedStore[matchId]) {
        scopedStore[matchId] = initial;
    }
}
export function setPrediction(period, matchId, prediction, scope) {
    const scopedStore = getScopeStore(period, scope);
    scopedStore[matchId] = prediction;
}
export function getPredictions(period, scope) {
    return getScopeStore(period, scope);
}
export function clonePredictions(period, scope) {
    const source = getScopeStore(period, scope);
    return Object.fromEntries(Object.entries(source).map(([matchId, value]) => [matchId, { home: value.home, away: value.away }]));
}
