// Use your own encapsulated request
import request from "./request";

// Permission cache to avoid duplicate requests for large lists
const permCache = new Map();

/**
 * Check button permission (with cache + anti-concurrency)
 * @param {string} actionCode - Three-part permission code, e.g. svc:ats:createAlog
 * @returns {Promise<boolean>} true = has permission
 */
export async function checkActionPerm(actionCode) {
    // No action code = no permission
    if (!actionCode) return false;

    // 1. Return directly if cache exists
    if (permCache.has(actionCode)) {
        return permCache.get(actionCode);
    }

    // 2. Prevent concurrent duplicate requests for the same action code
    const pendingPromise = permCache.get(actionCode);
    if (pendingPromise instanceof Promise) {
        return pendingPromise;
    }

    // 3. Send API request
    const promise = (async () => {
        try {
            const res = await request({
                url: "/api/uias/v1/uias/action/check",
                method: "POST",
                data: {
                    uias: {
                        action: actionCode,
                    },
                },
            });

            // Core rule: authentication === 1 means allowed
            const hasPerm = res?.data?.payload?.authentication === 1;

            // Save to cache
            permCache.set(actionCode, hasPerm);
            return hasPerm;
        } catch (err) {
            console.error("Permission check failed:", actionCode, err);
            permCache.set(actionCode, false);
            return false;
        }
    })();

    // Store promise first to avoid concurrency issues
    permCache.set(actionCode, promise);
    return promise;
}

/**
 * Clear permission cache (call on logout)
 */
export function clearActionPermCache() {
    permCache.clear();
}
