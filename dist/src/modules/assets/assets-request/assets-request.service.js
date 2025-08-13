"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsRequestService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const asset_requests_schema_1 = require("../schema/asset-requests.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const asset_approval_schema_1 = require("../schema/asset-approval.schema");
const assets_settings_service_1 = require("../settings/assets-settings.service");
const pusher_service_1 = require("../../notification/services/pusher.service");
let AssetsRequestService = class AssetsRequestService {
    constructor(db, auditService, assetsSettingsService, pusher) {
        this.db = db;
        this.auditService = auditService;
        this.assetsSettingsService = assetsSettingsService;
        this.pusher = pusher;
    }
    async handleAssetApprovalFlow(assetRequestId, user) {
        const assetSettings = await this.assetsSettingsService.getAssetSettings(user.companyId);
        const multi = assetSettings.multiLevelApproval;
        const chain = assetSettings.approverChain || [];
        let [workflow] = await this.db
            .select()
            .from(schema_1.approvalWorkflows)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, assetRequestId)))
            .execute();
        if (!workflow) {
            [workflow] = await this.db
                .insert(schema_1.approvalWorkflows)
                .values({
                name: 'Asset Request Approval',
                companyId: user.companyId,
                entityId: assetRequestId,
                entityDate: new Date().toDateString(),
                createdAt: new Date(),
            })
                .returning()
                .execute();
        }
        const workflowId = workflow.id;
        const existingSteps = await this.db
            .select()
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, workflowId))
            .execute();
        if (existingSteps.length === 0) {
            const steps = multi
                ? chain.reverse().map((role, idx) => ({
                    workflowId,
                    sequence: idx + 1,
                    role,
                    minApprovals: 1,
                    maxApprovals: 1,
                    createdAt: new Date(),
                }))
                : [
                    {
                        workflowId,
                        sequence: 1,
                        role: 'it_manager',
                        status: 'approved',
                        minApprovals: 1,
                        maxApprovals: 1,
                        createdAt: new Date(),
                    },
                ];
            const createdSteps = await this.db
                .insert(schema_1.approvalSteps)
                .values(steps)
                .returning({ id: schema_1.approvalSteps.id })
                .execute();
            await this.db
                .insert(asset_approval_schema_1.assetApprovals)
                .values({
                assetRequestId,
                stepId: createdSteps[0].id,
                actorId: user.id,
                action: multi ? 'pending' : 'approved',
                remarks: multi ? 'Pending approval' : 'Auto-approved',
                createdAt: new Date(),
            })
                .execute();
        }
        if (!multi) {
            const [step] = await this.db
                .select()
                .from(schema_1.approvalSteps)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, workflowId), (0, drizzle_orm_1.eq)(schema_1.approvalSteps.sequence, 1)))
                .execute();
            const [updated] = await this.db
                .update(asset_requests_schema_1.assetRequests)
                .set({ status: 'approved' })
                .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, assetRequestId))
                .returning()
                .execute();
            if (step) {
                await this.db
                    .insert(asset_approval_schema_1.assetApprovals)
                    .values({
                    assetRequestId,
                    stepId: step.id,
                    actorId: user.id,
                    action: 'approved',
                    remarks: 'Auto-approved',
                    createdAt: new Date(),
                })
                    .execute();
            }
            await this.pusher.createEmployeeNotification(user.companyId, updated.employeeId, `Your asset request has been auto-approved.`, 'asset');
            await this.pusher.createNotification(user.companyId, `Your asset request has been auto-approved.`, 'asset');
        }
    }
    async create(dto, user) {
        const [existRequest] = await this.db
            .select()
            .from(asset_requests_schema_1.assetRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.employeeId, dto.employeeId), (0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.assetType, dto.assetType), (0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.companyId, user.companyId)))
            .limit(1);
        if (existRequest) {
            throw new common_1.BadRequestException('You already have a request pending or active.');
        }
        const [newRequest] = await this.db
            .insert(asset_requests_schema_1.assetRequests)
            .values({
            ...dto,
            companyId: user.companyId,
            status: 'requested',
            createdAt: new Date(),
        })
            .returning()
            .execute();
        await this.pusher.createNotification(user.companyId, `Asset request by ${user.firstName} ${user.lastName} for ${newRequest.assetType} has been created.`, 'asset');
        await this.handleAssetApprovalFlow(newRequest.id, user);
        await this.auditService.logAction({
            action: 'create',
            entity: 'asset_request',
            entityId: newRequest.id,
            userId: user.id,
            details: `Asset request created for ${newRequest.assetType}`,
            changes: {
                assetType: newRequest.assetType,
                purpose: newRequest.purpose,
                urgency: newRequest.urgency,
                notes: newRequest.notes,
            },
        });
        return newRequest;
    }
    findAll(companyId) {
        const urgencyOrder = (0, drizzle_orm_1.sql) `
      CASE
        WHEN ${asset_requests_schema_1.assetRequests.urgency} = 'Critical' THEN 1
        WHEN ${asset_requests_schema_1.assetRequests.urgency} = 'High' THEN 2
        WHEN ${asset_requests_schema_1.assetRequests.urgency} = 'Normal' THEN 3
        ELSE 4
      END
    `;
        return this.db
            .select({
            id: asset_requests_schema_1.assetRequests.id,
            employeeId: asset_requests_schema_1.assetRequests.employeeId,
            assetType: asset_requests_schema_1.assetRequests.assetType,
            purpose: asset_requests_schema_1.assetRequests.purpose,
            urgency: asset_requests_schema_1.assetRequests.urgency,
            status: asset_requests_schema_1.assetRequests.status,
            requestDate: asset_requests_schema_1.assetRequests.requestDate,
            createdAt: asset_requests_schema_1.assetRequests.createdAt,
            employeeName: (0, drizzle_orm_1.sql) `${schema_1.employees.firstName} || ' ' || ${schema_1.employees.lastName}`,
            employeeEmail: schema_1.employees.email,
        })
            .from(asset_requests_schema_1.assetRequests)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, asset_requests_schema_1.assetRequests.employeeId))
            .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.companyId, companyId))
            .orderBy(urgencyOrder, (0, drizzle_orm_1.desc)(asset_requests_schema_1.assetRequests.createdAt))
            .execute();
    }
    async findOne(id) {
        const [request] = await this.db
            .select()
            .from(asset_requests_schema_1.assetRequests)
            .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, id))
            .execute();
        if (!request) {
            throw new common_1.BadRequestException(`Asset request with ID ${id} not found`);
        }
        return request;
    }
    async findByEmployeeId(employeeId) {
        const requests = await this.db
            .select()
            .from(asset_requests_schema_1.assetRequests)
            .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.employeeId, employeeId))
            .orderBy((0, drizzle_orm_1.desc)(asset_requests_schema_1.assetRequests.createdAt))
            .execute();
        if (requests.length === 0) {
            throw new common_1.BadRequestException(`No asset requests found for employee ID ${employeeId}`);
        }
        return requests;
    }
    async update(id, updateAssetsRequestDto, user) {
        await this.findOne(id);
        const [updatedRequest] = await this.db
            .update(asset_requests_schema_1.assetRequests)
            .set({
            ...updateAssetsRequestDto,
        })
            .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'asset_request',
            entityId: updatedRequest.id,
            userId: user.id,
            details: `Asset request updated for ${updatedRequest.assetType}`,
            changes: {
                assetType: updatedRequest.assetType,
                purpose: updatedRequest.purpose,
                urgency: updatedRequest.urgency,
                notes: updatedRequest.notes,
            },
        });
        return updatedRequest;
    }
    async checkApprovalStatus(assetRequestId, user) {
        const [request] = await this.db
            .select({
            id: asset_requests_schema_1.assetRequests.id,
            requestDate: asset_requests_schema_1.assetRequests.requestDate,
            approvalStatus: asset_requests_schema_1.assetRequests.status,
            workflowId: schema_1.approvalWorkflows.id,
            companyId: asset_requests_schema_1.assetRequests.companyId,
        })
            .from(asset_requests_schema_1.assetRequests)
            .leftJoin(schema_1.approvalWorkflows, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, asset_requests_schema_1.assetRequests.id), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, asset_requests_schema_1.assetRequests.companyId)))
            .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, assetRequestId))
            .execute();
        if (!request) {
            throw new common_1.NotFoundException(`Asset request not found`);
        }
        if (!request.workflowId) {
            throw new common_1.BadRequestException(`Approval workflow not initialized.`);
        }
        const steps = await this.db
            .select({
            id: schema_1.approvalSteps.id,
            sequence: schema_1.approvalSteps.sequence,
            role: schema_1.approvalSteps.role,
            minApprovals: schema_1.approvalSteps.minApprovals,
            maxApprovals: schema_1.approvalSteps.maxApprovals,
            createdAt: schema_1.approvalSteps.createdAt,
            status: schema_1.approvalSteps.status,
        })
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, request.workflowId))
            .orderBy(schema_1.approvalSteps.sequence)
            .execute();
        const assetSettings = await this.assetsSettingsService.getAssetSettings(request.companyId);
        const fallbackRoles = assetSettings.fallbackRoles || [];
        const enrichedSteps = steps.map((step) => {
            const isFallback = fallbackRoles.includes(user?.role || '');
            const isPrimary = user?.role === step.role;
            return {
                ...step,
                fallbackRoles,
                isUserEligible: isPrimary || isFallback,
                isFallback: !isPrimary && isFallback,
            };
        });
        return {
            requestDate: request.requestDate,
            approvalStatus: request.approvalStatus,
            steps: enrichedSteps,
        };
    }
    async handleAssetApprovalAction(assetRequestId, user, action, remarks) {
        const [request] = await this.db
            .select({
            id: asset_requests_schema_1.assetRequests.id,
            workflowId: schema_1.approvalWorkflows.id,
            approvalStatus: asset_requests_schema_1.assetRequests.status,
            employeeId: asset_requests_schema_1.assetRequests.employeeId,
        })
            .from(asset_requests_schema_1.assetRequests)
            .leftJoin(schema_1.approvalWorkflows, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, asset_requests_schema_1.assetRequests.id), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, user.companyId)))
            .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, assetRequestId))
            .limit(1)
            .execute();
        if (!request) {
            throw new common_1.NotFoundException(`Asset request not found`);
        }
        if (request.approvalStatus === 'approved' ||
            request.approvalStatus === 'rejected') {
            throw new common_1.BadRequestException(`This request has already been ${request.approvalStatus}.`);
        }
        if (!request.workflowId) {
            throw new common_1.BadRequestException(`Approval workflow not initialized.`);
        }
        const steps = await this.db
            .select({
            id: schema_1.approvalSteps.id,
            sequence: schema_1.approvalSteps.sequence,
            role: schema_1.approvalSteps.role,
            status: schema_1.approvalSteps.status,
        })
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, request.workflowId))
            .orderBy(schema_1.approvalSteps.sequence)
            .execute();
        const currentStep = steps.find((s) => s.status === 'pending');
        if (!currentStep) {
            throw new common_1.BadRequestException(`No pending steps left to act on.`);
        }
        const settings = await this.assetsSettingsService.getAssetSettings(user.companyId);
        const fallbackRoles = settings.fallbackRoles || [];
        const actorRole = currentStep.role;
        const isFallback = fallbackRoles.includes(user.role);
        const isActor = user.role === actorRole;
        if (!isActor && !isFallback) {
            throw new common_1.BadRequestException(`You do not have permission to take action on this step. Required: ${actorRole}`);
        }
        if (action === 'rejected') {
            await this.db
                .update(schema_1.approvalSteps)
                .set({ status: 'rejected' })
                .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.id, currentStep.id))
                .execute();
            await this.db.insert(asset_approval_schema_1.assetApprovals).values({
                assetRequestId,
                actorId: user.id,
                action,
                remarks: remarks ?? '',
                stepId: currentStep.id,
                createdAt: new Date(),
            });
            await this.db
                .update(asset_requests_schema_1.assetRequests)
                .set({
                status: 'rejected',
                rejectionReason: remarks ?? '',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, assetRequestId))
                .execute();
            await this.pusher.createEmployeeNotification(user.companyId, request.employeeId, `Your asset request has been ${action}`, 'asset');
            await this.pusher.createNotification(user.companyId, `Your asset request has been ${action}`, 'asset');
            return `Asset request rejected successfully`;
        }
        if (isFallback) {
            const remainingSteps = steps.filter((s) => s.status === 'pending');
            for (const step of remainingSteps) {
                await this.db
                    .update(schema_1.approvalSteps)
                    .set({ status: 'approved' })
                    .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.id, step.id))
                    .execute();
                await this.db.insert(asset_approval_schema_1.assetApprovals).values({
                    assetRequestId,
                    actorId: user.id,
                    action: 'approved',
                    remarks: `[Fallback] ${remarks ?? ''}`,
                    stepId: step.id,
                    createdAt: new Date(),
                });
            }
            await this.db
                .update(asset_requests_schema_1.assetRequests)
                .set({
                status: 'approved',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, assetRequestId))
                .execute();
            await this.pusher.createEmployeeNotification(user.companyId, request.employeeId, `Your asset request has been ${action}`, 'asset');
            await this.pusher.createNotification(user.companyId, `Your asset request has been ${action}`, 'asset');
            return `Asset request fully approved via fallback`;
        }
        await this.db
            .update(schema_1.approvalSteps)
            .set({ status: 'approved' })
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.id, currentStep.id))
            .execute();
        await this.db.insert(asset_approval_schema_1.assetApprovals).values({
            assetRequestId,
            actorId: user.id,
            action,
            remarks: remarks ?? '',
            stepId: currentStep.id,
            createdAt: new Date(),
        });
        const allApproved = steps.every((s) => s.id === currentStep.id || s.status === 'approved');
        if (allApproved) {
            await this.db
                .update(asset_requests_schema_1.assetRequests)
                .set({
                status: 'approved',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(asset_requests_schema_1.assetRequests.id, assetRequestId))
                .execute();
        }
        await this.pusher.createEmployeeNotification(user.companyId, request.employeeId, `Your asset request has been ${action}`, 'asset');
        await this.pusher.createNotification(user.companyId, `Your asset request has been ${action}`, 'asset');
        return `Asset request ${action} successfully`;
    }
};
exports.AssetsRequestService = AssetsRequestService;
exports.AssetsRequestService = AssetsRequestService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        assets_settings_service_1.AssetsSettingsService,
        pusher_service_1.PusherService])
], AssetsRequestService);
//# sourceMappingURL=assets-request.service.js.map