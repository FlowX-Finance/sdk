import { normalizeSuiObjectId } from '@mysten/sui/utils';

export class ObjectId {
  public readonly id!: string;

  constructor(objectId: string) {
    this.id = normalizeSuiObjectId(objectId);
  }
}
