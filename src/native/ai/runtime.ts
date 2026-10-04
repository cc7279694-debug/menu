import type { RecipeLibrary } from "../recipe-model";
import type { BackupController } from "../backup/backup-controls";
import { AiIntakeService } from "./service";
import { createAiBridge,createAiKeyPort } from "./native-bridge";
const services=new WeakMap<RecipeLibrary,AiIntakeService>();
export function openAiIntakeRuntime(store:RecipeLibrary,backup?:BackupController):AiIntakeService{
  let service=services.get(store);if(!service){service=new AiIntakeService(createAiKeyPort(),createAiBridge(),{store,backup});services.set(store,service);}return service;
}
