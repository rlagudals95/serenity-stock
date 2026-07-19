export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function errorDetails(error: unknown) {
  return {
    code: "pipeline_failed",
    message: error instanceof Error ? error.message : String(error),
  };
}
