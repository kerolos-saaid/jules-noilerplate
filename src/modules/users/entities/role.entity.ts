import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../core/entity/base.entity";

@Entity()
export class Role extends BaseEntity {
  @Column({ unique: true })
  name: string;
}
