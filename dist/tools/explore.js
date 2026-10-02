"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explore = explore;
const api_js_1 = require("../dcl/api.js");
const client_js_1 = require("../lowdown/client.js");
function getActivityScore(scene) {
    if (!scene)
        return 'dead';
    const visits = scene.user_visits ?? 0;
    const userCount = scene.user_count ?? 0;
    const deployedAt = scene.deployed_at ? new Date(scene.deployed_at) : null;
    const daysSinceDeployed = deployedAt
        ? (Date.now() - deployedAt.getTime()) / (1000 * 60 * 60 * 24)
        : 9999;
    if (userCount > 0)
        return 'active';
    if (visits > 100)
        return 'medium';
    if (visits > 10 || daysSinceDeployed < 90)
        return 'low';
    return 'dead';
}
function classifyScene(scene) {
    const text = `${scene.title ?? ''} ${scene.description ?? ''}`.toLowerCase();
    if (text.match(/ai|agent|gpt|llm|machine learning|ml/))
        return 'ai_service';
    if (text.match(/art|gallery|museum|exhibit/))
        return 'art';
    if (text.match(/game|play|quest|arena|battle/))
        return 'game';
    if (text.match(/shop|store|market|buy|sell|nft/))
        return 'shop';
    if (text.match(/event|concert|show|party/))
        return 'event';
    if (text.match(/education|learn|school|course/))
        return 'education';
    return 'other';
}
function evaluateRelevance(category, activityScore) {
    if (category === 'ai_service')
        return 'high';
    if (activityScore === 'active')
        return 'medium';
    if (category === 'shop' || category === 'event')
        return 'medium';
    return 'low';
}
function getNearbyParcels(base, radius = 5) {
    const [bx, by] = base.split(',').map(Number);
    const parcels = [];
    for (let x = bx - radius; x <= bx + radius; x++) {
        for (let y = by - radius; y <= by + radius; y++) {
            if (x === bx && y === by)
                continue;
            parcels.push(`${x},${y}`);
        }
    }
    return parcels;
}
async function explore(params) {
    const { agentId, baseParcel, radius = 5 } = params;
    const visited = await client_js_1.lowdownClient.getVisitedParcels(agentId);
    const nearby = getNearbyParcels(baseParcel, radius);
    const unvisited = nearby.filter(p => !visited.includes(p));
    if (unvisited.length === 0) {
        return { status: 'all_visited', visited: visited.length };
    }
    const registeredScenes = await client_js_1.lowdownClient.getRegisteredScenes();
    const registeredParcels = registeredScenes.map(s => s.parcel);
    const allToCheck = visited.includes(baseParcel) ? unvisited : [baseParcel, ...unvisited];
    const registeredUnvisited = allToCheck.filter(p => registeredParcels.includes(p));
    const prioritized = [...registeredUnvisited, ...allToCheck.filter(p => !registeredParcels.includes(p))];
    for (const parcel of prioritized) {
        const info = await (0, api_js_1.getParcelInfo)(parcel);
        const registeredScene = registeredScenes.find(s => s.parcel === parcel);
        if (!info.scene && !registeredScene)
            continue;
        const activityScore = getActivityScore(info.scene);
        const isRegistered = !!registeredScene;
        if (activityScore === 'dead' && !isRegistered) {
            await (0, client_js_1.recordInteraction)({ agentId, parcel, action: 'skip', outcome: 'success' });
            continue;
        }
        const category = registeredScene?.category ?? classifyScene(info.scene);
        const sceneName = registeredScene?.name ?? info.scene?.title ?? parcel;
        const relevance = evaluateRelevance(category, activityScore);
        await (0, client_js_1.recordInteraction)({ agentId, parcel, action: 'discover', outcome: 'success' });
        await (0, client_js_1.recordInteraction)({ agentId, parcel, action: `classify:${category}`, outcome: 'success' });
        await (0, client_js_1.recordInteraction)({ agentId, parcel, action: `evaluate:${relevance}`, outcome: 'success' });
        if (relevance === 'high') {
            await (0, client_js_1.recordInteraction)({ agentId, parcel, action: 'recommend', outcome: 'success' });
        }
        return {
            status: 'discovered',
            target: parcel,
            scene: sceneName,
            activity_score: activityScore,
            category,
            relevance,
            agent_instructions: registeredScene?.agentInstructions ?? null,
            visited_before: visited.length,
            timestamp: new Date().toISOString()
        };
    }
    return {
        status: 'no_active_scene',
        scanned: unvisited.length,
        visited_before: visited.length
    };
}
