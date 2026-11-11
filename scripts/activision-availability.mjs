// Fixed, credential-free availability checks only. No cookie jar or account identifiers.
const urls = [
  "https://www.callofduty.com/api/apexrest/oshp/landingpage",
  "https://www.callofduty.com/api/papi-client/crm/cod/v2/accounts",
];
const results = await Promise.all(
  urls.map(async (url) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      const result = {
        url,
        status: response.status,
        contentType: response.headers.get("content-type"),
        redirect: response.status >= 300 && response.status < 400,
      };
      if (result.contentType?.includes("application/json")) {
        const reader = response.body.getReader();
        let size = 0;
        const chunks = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 65536) {
            await reader.cancel();
            throw Error("Response exceeds metadata check limit");
          }
          chunks.push(value);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        // Record only a known envelope enum, never data, messages, identifiers or tokens.
        result.applicationStatus = [
          "success",
          "error",
          "unauthorized",
          "failure",
        ].includes(body.status)
          ? body.status
          : "unrecognized";
      } else await response.body?.cancel();
      return result;
    } catch (error) {
      return { url, error: error.name, cause: error.cause?.code || null };
    }
  }),
);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      authenticated: false,
      accountLinked: false,
      responseBodiesStored: false,
      results,
    },
    null,
    2,
  ),
);
