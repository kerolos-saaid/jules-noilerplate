import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { ClsService } from 'nestjs-cls';
import { BaseEntity } from '../entity/base.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<BaseEntity> {
  constructor(private readonly cls: ClsService) {}

  listenTo() {
    return BaseEntity;
  }

  beforeInsert(event: InsertEvent<BaseEntity>) {
    const userId = this.cls.get('userId');
    if (userId) {
      event.entity.createdBy = userId;
    }
  }

  beforeUpdate(event: UpdateEvent<BaseEntity>) {
    const userId = this.cls.get('userId');
    if (userId && event.entity) {
      event.entity.updatedBy = userId;
    }
  }
}
