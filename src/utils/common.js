export function toLoginPage() {
    let url = `/authui/login.html?returnto=${encodeURIComponent(window.location.href)}`;
    return (window.location.href = url);
}

export function toUserCenter() {
    let url = `/console/#/accountInfo`;
    return (window.location.href = url);
}

export function toConsole() {
    let url = `/console`;
    return (window.location.href = url);
}

export function convertToLimitOffset(page, pageSize) {
    // Convert parameters to numbers if they are strings
    const pageNum = Number(page);
    const size = Number(pageSize);

    // Validate parameters
    if (isNaN(pageNum) || isNaN(size)) {
        throw new Error("Page and pageSize must be numbers");
    }
    if (pageNum < 1) {
        throw new Error("Page must be at least 1");
    }
    if (size < 1) {
        throw new Error("PageSize must be at least 1");
    }

    // Calculate limit and offset
    const limit = Math.floor(size);
    const offset = Math.floor((pageNum - 1) * size);

    return { offset, limit };
}

// Higher-order function for delay processing
// This function wraps an asynchronous request function and ensures that the response
// (whether successful or failed) is delayed by at least the specified waitTime
// If the request completes before waitTime, it will wait for the remaining time
// If the request takes longer than waitTime, it will resolve/reject immediately upon completion
export function withDelay(requestFn, waitTime = 380) {
    // Record the start time of the request
    const startTime = Date.now();

    const requestPromise = requestFn();
    return new Promise((resolve, reject) => {
        requestPromise
            .then((result) => {
                // Calculate time elapsed since the request started
                const elapsed = Date.now() - startTime;
                // Calculate remaining wait time (ensure it's not negative)
                const remainingWait = Math.max(0, waitTime - elapsed);
                // Resolve with the result after the remaining wait time
                setTimeout(() => {
                    resolve(result);
                }, remainingWait);
            })
            .catch((error) => {
                const elapsed = Date.now() - startTime;
                const remainingWait = Math.max(0, waitTime - elapsed);
                setTimeout(() => {
                    reject(error);
                }, remainingWait);
            });
    });
}

/**
 * Parse the filename from an axios response's Content-Disposition header.
 * Supports both `filename*=UTF-8''xxx` and `filename=xxx`.
 * @param {import("axios").AxiosResponse} resp
 * @param {string} fallback Fallback filename used when parsing fails.
 */
export function getFilenameFromResponse(resp, fallback = "download") {
    const cd = resp?.headers?.["content-disposition"] || resp?.headers?.["Content-Disposition"] || "";
    if (!cd) return fallback;
    const star = cd.match(/filename\*\s*=\s*([^;]+)/i);
    if (star) {
        let v = star[1].trim().replace(/^["']|["']$/g, "");
        const parts = v.split("''");
        const encoded = parts.length > 1 ? parts[1] : v;
        try {
            return decodeURIComponent(encoded);
        } catch {
            return encoded;
        }
    }
    const m = cd.match(/filename\s*=\s*([^;]+)/i);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    return fallback;
}
