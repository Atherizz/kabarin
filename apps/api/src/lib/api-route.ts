import { OpenAPIRoute } from "chanfana";

// Workaround: `declare schema: any` resolves TS incompatibility between Chanfana and Zod v3 strict mode
export class ApiRoute extends OpenAPIRoute {
  declare schema: any;

  async getValidatedData<S = any>(): Promise<any> {
    return super.getValidatedData<S>();
  }
}

// Cast helper for registering ApiRoute subclasses with Chanfana router
export function asRoute<T extends typeof ApiRoute>(endpoint: T): typeof OpenAPIRoute<any> {
  return endpoint as unknown as typeof OpenAPIRoute<any>;
}
