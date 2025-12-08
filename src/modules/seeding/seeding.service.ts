import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcrypt";
import { Role } from "../users/entities/role.entity";
import { User } from "../users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class SeedingService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async seed() {
    let adminRole = await this.roleRepository.findOne({
      where: { name: "Admin" },
    });
    if (!adminRole) {
      adminRole = this.roleRepository.create({ name: "Admin" });
      await this.roleRepository.save(adminRole);
    }

    let userRole = await this.roleRepository.findOne({
      where: { name: "User" },
    });
    if (!userRole) {
      userRole = this.roleRepository.create({ name: "User" });
      await this.roleRepository.save(userRole);
    }

    let adminUser = await this.usersService.findOne("admin");
    if (!adminUser) {
      const password_hash = await bcrypt.hash("12345678", 10);
      adminUser = await this.usersService.create({
        username: "admin",
        password_hash,
        roles: [adminRole],
      });
    }
  }
}
