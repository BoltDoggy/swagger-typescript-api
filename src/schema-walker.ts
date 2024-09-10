import { consola } from "consola";
import lodash from "lodash";
import type { CodeGenConfig } from "./configuration.js";
import type { SwaggerSchemaResolver } from "./swagger-schema-resolver.js";

// TODO: WIP
// this class will be needed to walk by schema everywhere
export class SchemaWalker {
  config: CodeGenConfig;
  swaggerSchemaResolver: SwaggerSchemaResolver;
  schemas = new Map<string, Record<string, any>>();
  caches = new Map<string, Record<string, any>>();

  constructor(
    config: CodeGenConfig,
    swaggerSchemaResolver: SwaggerSchemaResolver,
  ) {
    this.config = config;
    this.swaggerSchemaResolver = swaggerSchemaResolver;
  }

  addSchema = (name: string, schema: Record<string, any>) => {
    this.schemas.set(name, structuredClone(schema));
  };

  findByRef = (ref: string) => {
    consola.debug("try to resolve ref by path", ref);

    if (this.caches.has(ref)) {
      return this.caches.get(ref);
    }

    const schemas = Array.from(this.schemas.values());
    if (this._isLocalRef(ref)) {
      for (const schema of schemas) {
        const refData = this._getRefDataFromSchema(schema, ref);
        if (refData) {
          return refData;
        }
      }
    } else if (this._isRemoteRef(ref)) {
      consola.debug("remote refs not supported", ref);
      return null;
    } else {
      // @ts-expect-error TS(2448) FIXME: Block-scoped variable 'path' used before its decla... Remove this comment to see the full error message
      const [address, path] = path.split("#");
      let swaggerSchemaObject;

      if (this.schemas.has(address)) {
        swaggerSchemaObject = this.schemas.get(address);
      } else {
        const pathToSchema = path.resolve(process.cwd(), address);
        const swaggerSchemaFile =
          this.swaggerSchemaResolver.getSwaggerSchemaByPath(pathToSchema);
        swaggerSchemaObject =
          this.swaggerSchemaResolver.processSwaggerSchemaFile(
            swaggerSchemaFile,
          );
        this.schemas.set(address, swaggerSchemaObject);
      }

      return this._getRefDataFromSchema(swaggerSchemaObject, path);
    }
  };

  _isLocalRef = (ref) => {
    return ref.startsWith("#");
  };

  _isRemoteRef = (ref) => {
    return ref.startsWith("http://") || ref.startsWith("https://");
  };

  _getRefDataFromSchema = (schema, ref) => {
    const path = ref.replace("#", "").split("/");
    const refData = lodash.get(schema, path);
    if (refData) {
      this.caches.set(ref, refData);
    }
    return refData;
  };
}
