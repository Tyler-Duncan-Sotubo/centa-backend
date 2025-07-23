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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const verification_service_1 = require("./verification.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const aws_service_1 = require("../../../common/aws/aws.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const invitation_service_1 = require("../../notification/services/invitation.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const permissions_service_1 = require("../permissions/permissions.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let UserService = class UserService {
    constructor(db, verificationService, jwtService, configService, awsService, invitation, companySettingsService, permissionService, permissionSeedQueue) {
        this.db = db;
        this.verificationService = verificationService;
        this.jwtService = jwtService;
        this.configService = configService;
        this.awsService = awsService;
        this.invitation = invitation;
        this.companySettingsService = companySettingsService;
        this.permissionService = permissionService;
        this.permissionSeedQueue = permissionSeedQueue;
    }
    async register(dto) {
        const existingCompany = await this.db
            .select()
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.domain, dto.domain.toLowerCase()))
            .execute();
        if (existingCompany.length > 0) {
            throw new common_1.BadRequestException('Company already exists.');
        }
        if (await this.findUserByEmail(dto.email.toLowerCase())) {
            throw new common_1.BadRequestException('User already exists.');
        }
        const [company] = await this.db
            .insert(schema_1.companies)
            .values({
            name: dto.companyName,
            country: dto.country,
            domain: dto.domain.toLowerCase(),
        })
            .returning({ id: schema_1.companies.id, name: schema_1.companies.name })
            .execute();
        const hashed = await bcrypt.hash(dto.password, 10);
        const roles = await this.permissionService.createDefaultRoles(company.id);
        const role = roles.find((role) => role.name === dto.role);
        if (!role) {
            throw new common_1.BadRequestException('role not found.');
        }
        const newUser = await this.db.transaction(async (trx) => {
            const [user] = await trx
                .insert(schema_1.users)
                .values({
                email: dto.email.toLowerCase(),
                firstName: dto.firstName,
                lastName: dto.lastName,
                password: hashed,
                companyId: company.id,
                companyRoleId: role.id,
            })
                .returning({ id: schema_1.users.id, email: schema_1.users.email })
                .execute();
            await trx.insert(schema_1.companyFileFolders).values({
                companyId: company.id,
                name: 'Account Documents',
                isSystem: true,
            });
            await trx.insert(schema_1.companyLocations).values({
                name: 'Head Office',
                country: dto.country,
                companyId: company.id,
                isPrimary: true,
            });
            return user;
        });
        await this.companySettingsService.setSettings(company.id);
        await this.permissionSeedQueue.add('seed-permissions', { companyId: company.id }, { delay: 3000 });
        await this.verificationService.generateVerificationToken(newUser.id, company.name);
        return { user: newUser, company: { id: company.id, domain: dto.domain } };
    }
    async inviteUser(dto, company_id) {
        const company = await this.db
            .select({
            name: schema_1.companies.name,
        })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, company_id))
            .execute();
        const token = this.jwtService.sign({
            email: dto.email,
            companyRoleId: dto.companyRoleId,
            company_id,
        });
        const inviteLink = `${this.configService.get('CLIENT_URL')}/auth/invite/${token}`;
        await this.invitation.sendInvitationEmail(dto.email, dto.name, company[0].name, dto.companyRoleId, inviteLink);
        return {
            token,
            company_name: company[0].name,
        };
    }
    async verifyInvite(token) {
        const decoded = await this.jwtService.verify(token);
        const { email, company_id, companyRoleId } = decoded;
        let user = await this.findUserByEmail(email);
        const userData = {
            email: email,
            password: await bcrypt.hash('defaultPassword123', 10),
            companyRoleId: companyRoleId,
            companyId: company_id,
        };
        if (!user) {
            const [newUser] = await this.db
                .insert(schema_1.users)
                .values(userData)
                .returning()
                .execute();
            user = newUser;
        }
        else {
            await this.db
                .update(schema_1.users)
                .set({ companyRoleId })
                .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
                .execute();
        }
        if (!user) {
            throw new Error('User creation or retrieval failed.');
        }
        return { message: 'Invitation accepted', email };
    }
    async findUserByEmail(email) {
        return this.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .limit(1)
            .execute()
            .then((res) => res[0]);
    }
    async companyUsers(company_id) {
        const allUsers = await this.db
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            role: schema_1.companyRoles.name,
            first_name: schema_1.users.firstName,
            last_name: schema_1.users.lastName,
            avatar: schema_1.users.avatar,
            lastLogin: schema_1.users.lastLogin,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.companyId, company_id), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(schema_1.companyRoles.name, 'employee'))))
            .execute();
        if (allUsers.length === 0) {
            new common_1.BadRequestException('No users found for this company.');
        }
        return allUsers;
    }
    async editUserRole(user_id, dto) {
        await this.db
            .update(schema_1.users)
            .set({
            companyRoleId: dto.companyRoleId,
            firstName: dto.name,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user_id))
            .execute();
    }
    async getUserProfile(user_id) {
        const user = await this.db
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            role: schema_1.companyRoles.name,
            first_name: schema_1.users.firstName,
            last_name: schema_1.users.lastName,
            avatar: schema_1.users.avatar,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user_id))
            .execute();
        if (user.length === 0) {
            new common_1.BadRequestException('User not found.');
        }
        return user[0];
    }
    async UpdateUserProfile(user_id, dto) {
        const userAvatar = await this.awsService.uploadImageToS3(dto.email, 'avatar', dto.avatar);
        const updatedProfile = await this.db
            .update(schema_1.users)
            .set({
            firstName: dto.first_name,
            lastName: dto.last_name,
            avatar: userAvatar,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user_id))
            .returning({
            id: schema_1.users.id,
            email: schema_1.users.email,
            first_name: schema_1.users.firstName,
            last_name: schema_1.users.lastName,
            avatar: schema_1.users.avatar,
        })
            .execute();
        return updatedProfile[0];
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(8, (0, bullmq_1.InjectQueue)('permission-seed-queue')),
    __metadata("design:paramtypes", [Object, verification_service_1.VerificationService,
        jwt_1.JwtService,
        config_1.ConfigService,
        aws_service_1.AwsService,
        invitation_service_1.InvitationService,
        company_settings_service_1.CompanySettingsService,
        permissions_service_1.PermissionsService,
        bullmq_2.Queue])
], UserService);
//# sourceMappingURL=user.service.js.map