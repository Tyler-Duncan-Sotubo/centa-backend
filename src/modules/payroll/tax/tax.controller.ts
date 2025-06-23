import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { TaxService } from './tax.service';
import { FastifyReply } from 'fastify';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { Audit } from 'src/modules/audit/audit.decorator';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('tax')
export class TaxController extends BaseController {
  constructor(private readonly taxService: TaxService) {
    super();
  }

  @Get('tax-filings-download/:id')
  @SetMetadata('permission', ['tax.download'])
  async downloadExcel(
    @Param('id') tax_filing_id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const buffer =
        await this.taxService.generateTaxFilingExcel(tax_filing_id);

      reply
        .header(
          'Content-Disposition',
          `attachment; filename=tax_filing_${tax_filing_id}.xlsx`,
        )
        .header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );

      return reply.send(buffer);
    } catch (error) {
      reply.status(500).send({
        message: 'Error generating Excel file',
        error: error.message,
      });
    }
  }

  @Get('voluntary-download')
  @SetMetadata('permission', ['tax.download'])
  async downloadVoluntary(
    @Query('type') type: string,
    @Query('month') month: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const buffer = await this.taxService.generateVoluntaryDeductionsExcel(
        type,
        month,
      );

      reply
        .header(
          'Content-Disposition',
          `attachment; filename=tax_filing_${type}.xlsx`,
        )
        .header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );

      return reply.send(buffer);
    } catch (error) {
      reply.status(500).send({
        message: 'Error generating Excel file',
        error: error.message,
      });
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['tax.read'])
  async getCompanyTaxFilings(@CurrentUser() user: User) {
    return this.taxService.getCompanyTaxFilings(user.companyId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['tax.manage'])
  @Audit({ action: 'Update Company Tax Filings', entity: 'Tax' })
  async updateCompanyTaxFilings(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.taxService.updateCompanyTaxFilings(id, status);
  }

  @Post('tax-filing')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['tax.manage'])
  async createCompanyTaxFiling(@CurrentUser() user: User) {
    return this.taxService.onPayrollApproval(
      user.companyId,
      '2025-05',
      'fdc8a547-12ea-4baf-bc61-9601226d5f6a',
    );
  }
}
