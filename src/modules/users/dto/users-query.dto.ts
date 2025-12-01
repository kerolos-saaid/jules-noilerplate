import { IsOptional, IsString } from 'class-validator';
import { QueryDto } from '../../../common/dto/query.dto';

export class UsersQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  username?: string;
}
