import { DataSource, EntityTarget, Repository, ObjectLiteral } from 'typeorm';
import { logger } from '../../utils/logger';

export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  constructor(private dataSource: DataSource, entity: EntityTarget<T>) {
    super(entity, dataSource.manager);
  }

  protected async safeOperation(operation: Promise<any>, errorMessage: string): Promise<any> {
    try {
      return await operation;
    } catch (error) {
      logger.error(`${errorMessage}: ${error}`);
      throw error;
    }
  }
}