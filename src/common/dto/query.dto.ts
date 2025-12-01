import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class QueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
