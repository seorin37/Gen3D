declare module "three/examples/jsm/loaders/MTLLoader" {
  import { Loader, LoadingManager } from "three";

  // MaterialCreator 대신 any 사용
  export class MTLLoader extends Loader {
    constructor(manager?: LoadingManager);

    load(
      url: string,
      onLoad: (materialCreator: any) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;

    setMaterialOptions(options: any): void;
  }
}

declare module "three/examples/jsm/loaders/OBJLoader" {
  import { Loader, LoadingManager, Group } from "three";

  export class OBJLoader extends Loader {
    constructor(manager?: LoadingManager);

    // MaterialCreator 대신 any 사용
    setMaterials(materials: any): this;

    load(
      url: string,
      onLoad: (group: Group) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
}
