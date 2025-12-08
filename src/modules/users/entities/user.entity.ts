import { Entity, Column, ManyToMany, JoinTable } from "typeorm";
import { BaseEntity } from "../../../core/entity/base.entity";
import { Role } from "./role.entity";

@Entity()
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @ManyToMany(() => Role)
  @JoinTable()
  roles: Role[];
}
