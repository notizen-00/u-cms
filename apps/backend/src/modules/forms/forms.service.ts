import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { validateSubmission, type FormFieldConfig } from '@unej-cms/plugin-form-builder';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { formSubmissions, forms } from '../../database/schema';
import type { CreateFormDto } from './dto/create-form.dto';
import type { SubmitFormDto } from './dto/submit-form.dto';
import type { UpdateFormDto } from './dto/update-form.dto';

@Injectable()
export class FormsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  listForSite(siteId: string) {
    return this.db
      .select()
      .from(forms)
      .where(eq(forms.siteId, siteId))
      .orderBy(desc(forms.createdAt));
  }

  findOne(siteId: string, formId: string) {
    return this.getOrThrow(siteId, formId);
  }

  async create(siteId: string, dto: CreateFormDto) {
    const [created] = await this.db
      .insert(forms)
      .values({
        siteId,
        title: dto.title,
        fields: dto.fields,
        ...(dto.submitLabel ? { submitLabel: dto.submitLabel } : {}),
        ...(dto.successMessage ? { successMessage: dto.successMessage } : {}),
      })
      .returning();
    return created;
  }

  async update(siteId: string, formId: string, dto: UpdateFormDto) {
    await this.getOrThrow(siteId, formId);
    const [updated] = await this.db
      .update(forms)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(forms.id, formId), eq(forms.siteId, siteId)))
      .returning();
    return updated;
  }

  async remove(siteId: string, formId: string) {
    await this.getOrThrow(siteId, formId);
    await this.db.delete(forms).where(and(eq(forms.id, formId), eq(forms.siteId, siteId)));
    return { success: true };
  }

  async listSubmissions(siteId: string, formId: string) {
    await this.getOrThrow(siteId, formId);
    return this.db
      .select()
      .from(formSubmissions)
      .where(and(eq(formSubmissions.formId, formId), eq(formSubmissions.siteId, siteId)))
      .orderBy(desc(formSubmissions.createdAt));
  }

  async removeSubmission(siteId: string, formId: string, submissionId: string) {
    await this.getOrThrow(siteId, formId);
    await this.db
      .delete(formSubmissions)
      .where(
        and(
          eq(formSubmissions.id, submissionId),
          eq(formSubmissions.formId, formId),
          eq(formSubmissions.siteId, siteId),
        ),
      );
    return { success: true };
  }

  async submit(siteId: string, formId: string, payload: SubmitFormDto) {
    const form = await this.getOrThrow(siteId, formId);

    const result = validateSubmission(
      form.fields as FormFieldConfig[],
      payload as unknown as Parameters<typeof validateSubmission>[1],
    );
    if (!result.ok) {
      throw new BadRequestException(result.errors);
    }

    const [submission] = await this.db
      .insert(formSubmissions)
      .values({ formId, siteId, data: result.value })
      .returning();

    return {
      success: true,
      submissionId: submission.id,
      successMessage: form.successMessage,
    };
  }

  private async getOrThrow(siteId: string, formId: string) {
    const [form] = await this.db
      .select()
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.siteId, siteId)))
      .limit(1);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    return form;
  }
}
