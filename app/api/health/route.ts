/**
 * @project  RLS Proof — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  Proprietary — all rights reserved
 */

export function GET() {
  return Response.json({
    status: "ok",
    product: "RLS Proof",
    version: "0.1.0",
    sqlStorage: false,
  });
}
