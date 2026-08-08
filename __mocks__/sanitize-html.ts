// sanitize-html pulls in htmlparser2, which ships an ESM-only build Jest's
// default CJS transform can't parse. Jest auto-applies mocks placed here
// (adjacent to node_modules) for any node_modules package, no per-test
// jest.mock() call needed. This is a passthrough - real sanitization
// behavior isn't something any current test needs to exercise.
export default function sanitizeHtml(dirty: string): string {
  return dirty;
}
