/**
 * Deep-clone JSON-serializable values for report attachments (original values preserved).
 */
function sanitizeForReport(value, depth = 0) {
  if (depth > 20) return '[max-depth]';
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForReport(item, depth + 1));
  }
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === 'object' && v !== null) {
      out[key] = sanitizeForReport(v, depth + 1);
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Attach one JSON file per HTTP round-trip: optional `request`, plus response `body`. */
async function publishApiResponse(testInfo, { urlHint, status, statusText, body, requestPayload }) {
  const payload = {
    urlHint,
    ...(requestPayload != null && { request: sanitizeForReport(requestPayload) }),
    httpStatus: status,
    httpStatusText: statusText,
    body: sanitizeForReport(body)
  };
  await testInfo.attach('api-response.json', {
    body: Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'),
    contentType: 'application/json'
  });
}

module.exports = {
  sanitizeForReport,
  publishApiResponse
};
