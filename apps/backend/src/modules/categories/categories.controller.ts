import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SiteMemberGuard } from '../sites/guards/site-member.guard';
import { CategoriesService } from './categories.service';
import {
  createCategorySchema,
  type CreateCategoryDto,
} from './dto/create-category.dto';
import {
  updateCategorySchema,
  type UpdateCategoryDto,
} from './dto/update-category.dto';

@Controller('sites/:siteId/categories')
@UseGuards(SessionAuthGuard, SiteMemberGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Param('siteId') siteId: string) {
    return this.categoriesService.findAll(siteId);
  }

  @Get(':id')
  findOne(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.categoriesService.findOne(siteId, id);
  }

  @Post()
  create(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(siteId, dto);
  }

  @Patch(':id')
  update(
    @Param('siteId') siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(siteId, id, dto);
  }

  @Delete(':id')
  remove(@Param('siteId') siteId: string, @Param('id') id: string) {
    return this.categoriesService.remove(siteId, id);
  }
}
