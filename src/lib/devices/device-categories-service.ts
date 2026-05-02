import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";
import type { CrudRepository } from "@/lib/crud/contracts";
import { HttpCrudRepository } from "@/lib/crud/http-crud-repository";

export interface DeviceCategory {
  id: string;
  category_name: string;
  description: string;
}

export type DeviceCategoryInput = Omit<DeviceCategory, "id">;

export const defaultDeviceCategoryInput: DeviceCategoryInput = {
  category_name: "",
  description: "",
};

interface DeviceCategoryApiModel {
  id: string;
  category_name: string;
  description: string;
}

class DeviceCategoryRepository extends HttpCrudRepository<
  DeviceCategory,
  DeviceCategoryInput,
  DeviceCategoryInput,
  DeviceCategoryApiModel
> {
  protected resourcePath = "/device-categories";

  protected mapToEntity(apiModel: DeviceCategoryApiModel): DeviceCategory {
    return {
      id: String(apiModel.id),
      category_name: apiModel.category_name,
      description: apiModel.description,
    };
  }

  protected mapCreatePayload(input: DeviceCategoryInput): unknown {
    return input;
  }

  protected mapUpdatePayload(input: DeviceCategoryInput): unknown {
    return input;
  }

  protected getBaseUrl(): string {
    return appConfig.apiBaseUrl;
  }

  protected getAccessToken(): string | null {
    return getAccessToken();
  }
}

export class DeviceCategoriesService {
  constructor(
    private readonly repository: CrudRepository<
      DeviceCategory,
      DeviceCategoryInput,
      DeviceCategoryInput
    >,
  ) {}

  listCategories() {
    return this.repository.list();
  }

  getCategoryById(id: string) {
    return this.repository.getById(id);
  }

  createCategory(input: DeviceCategoryInput) {
    return this.repository.create(input);
  }

  updateCategory(id: string, input: DeviceCategoryInput) {
    return this.repository.update(id, input);
  }

  deleteCategory(id: string) {
    return this.repository.delete(id);
  }
}

export const deviceCategoriesService = new DeviceCategoriesService(
  new DeviceCategoryRepository(),
);
