import { validate } from 'class-validator';
import { IsOptional } from 'class-validator';
import { IsAllowedField } from './is-allowed-field.decorator';

class TestDto {
  @IsOptional()
  @IsAllowedField(['username', 'email', 'createdAt'])
  sortBy?: string;
}

describe('IsAllowedField Decorator', () => {
  it('should pass validation for allowed single field', async () => {
    const dto = new TestDto();
    dto.sortBy = 'username';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation for allowed comma-separated fields', async () => {
    const dto = new TestDto();
    dto.sortBy = 'username,email';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation for undefined value', async () => {
    const dto = new TestDto();
    dto.sortBy = undefined;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation for disallowed field', async () => {
    const dto = new TestDto();
    dto.sortBy = 'password';

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('sortBy');
    expect(errors[0].constraints?.isAllowedField).toContain('must be one of');
  });

  it('should fail validation for comma-separated fields with one invalid', async () => {
    const dto = new TestDto();
    dto.sortBy = 'username,password';

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('sortBy');
  });

  it('should fail validation for non-string value', async () => {
    const dto = new TestDto();
    (dto as any).sortBy = 123;

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });

  it('should provide clear error message with allowed fields', async () => {
    const dto = new TestDto();
    dto.sortBy = 'invalidField';

    const errors = await validate(dto);
    expect(errors[0].constraints?.isAllowedField).toBe(
      'sortBy must be one of: username, email, createdAt',
    );
  });
});
