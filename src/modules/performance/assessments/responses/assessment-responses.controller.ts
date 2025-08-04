import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { AssessmentResponsesService } from './responses.service';
import { SaveResponseDto } from './dto/save-response.dto';
import { BulkSaveResponsesDto } from './dto/bulk-save-responses.dto';

@Controller('assessment-responses')
@UseGuards(JwtAuthGuard)
export class AssessmentResponsesController {
  constructor(private readonly responsesService: AssessmentResponsesService) {}

  // Get all responses + questions for an assessment
  @Get('/:assessmentId')
  @SetMetadata('permissions', [
    'performance.reviews.read',
    'performance.reviews.read_team',
    'performance.reviews.manage_all',
  ])
  getResponses(@Param('assessmentId') assessmentId: string) {
    return this.responsesService.getResponsesForAssessment(assessmentId);
  }

  // Save/update a single response
  @Post(':assessmentId/save')
  @SetMetadata('permissions', [
    'performance.reviews.submit_self',
    'performance.reviews.submit_peer',
    'performance.reviews.submit_manager',
  ])
  saveResponse(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: SaveResponseDto,
    @CurrentUser() user: User,
  ) {
    return this.responsesService.saveResponse(assessmentId, dto, user);
  }

  // Bulk save responses (replace all)
  @Post(':assessmentId/bulk-save')
  @SetMetadata('permissions', [
    'performance.reviews.submit_self',
    'performance.reviews.submit_peer',
    'performance.reviews.submit_manager',
  ])
  bulkSaveResponses(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: BulkSaveResponsesDto,
    @CurrentUser() user: User,
  ) {
    return this.responsesService.bulkSaveResponses(assessmentId, dto, user);
  }
}
