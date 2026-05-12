export interface CrudReader<TEntity extends { id: string }> {
  list(): Promise<TEntity[]>;
  getById(id: string): Promise<TEntity>;
}

export interface CrudWriter<TCreate, TUpdate> {
  create(input: TCreate): Promise<void>;
  update(id: string, input: TUpdate): Promise<void>;
  delete(id: string): Promise<void>;
}

export type CrudRepository<
  TEntity extends { id: string },
  TCreate,
  TUpdate,
> = CrudReader<TEntity> & CrudWriter<TCreate, TUpdate>;
