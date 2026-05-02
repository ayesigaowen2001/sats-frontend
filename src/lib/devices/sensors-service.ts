import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";
import type { CrudRepository } from "@/lib/crud/contracts";
import { HttpCrudRepository } from "@/lib/crud/http-crud-repository";

export interface Sensor {
  id: string;
  sensor_name: string;
  unit: string;
  description: string;
}

export type SensorInput = Omit<Sensor, "id">;

export const defaultSensorInput: SensorInput = {
  sensor_name: "",
  unit: "",
  description: "",
};

interface SensorApiModel {
  id: string;
  sensor_name: string;
  unit: string;
  description: string;
}

class SensorRepository extends HttpCrudRepository<
  Sensor,
  SensorInput,
  SensorInput,
  SensorApiModel
> {
  protected resourcePath = "/sensors";

  protected mapToEntity(apiModel: SensorApiModel): Sensor {
    return {
      id: String(apiModel.id),
      sensor_name: apiModel.sensor_name,
      unit: apiModel.unit,
      description: apiModel.description,
    };
  }

  protected mapCreatePayload(input: SensorInput): unknown {
    return input;
  }

  protected mapUpdatePayload(input: SensorInput): unknown {
    return input;
  }

  protected getBaseUrl(): string {
    return appConfig.apiBaseUrl;
  }

  protected getAccessToken(): string | null {
    return getAccessToken();
  }
}

export class SensorsService {
  constructor(
    private readonly repository: CrudRepository<
      Sensor,
      SensorInput,
      SensorInput
    >,
  ) {}

  listSensors() {
    return this.repository.list();
  }

  getSensorById(id: string) {
    return this.repository.getById(id);
  }

  createSensor(input: SensorInput) {
    return this.repository.create(input);
  }

  updateSensor(id: string, input: SensorInput) {
    return this.repository.update(id, input);
  }

  deleteSensor(id: string) {
    return this.repository.delete(id);
  }
}

export const sensorsService = new SensorsService(new SensorRepository());
