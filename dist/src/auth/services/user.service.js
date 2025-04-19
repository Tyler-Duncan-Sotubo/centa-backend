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
const users_schema_1 = require("../../drizzle/schema/users.schema");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const bcrypt = require("bcryptjs");
const drizzle_orm_1 = require("drizzle-orm");
const verification_service_1 = require("./verification.service");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const invitation_service_1 = require("../../notification/services/invitation.service");
const aws_service_1 = require("../../config/aws/aws.service");
const deductions_schema_1 = require("../../drizzle/schema/deductions.schema");
const onboarding_service_1 = require("../../organization/services/onboarding.service");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const audit_service_1 = require("../../audit/audit.service");
const leave_attendance_schema_1 = require("../../drizzle/schema/leave-attendance.schema");
let UserService = class UserService {
    constructor(db, verificationService, invitation, jwtService, configService, awsService, onboardingService, auditService) {
        this.db = db;
        this.verificationService = verificationService;
        this.invitation = invitation;
        this.jwtService = jwtService;
        this.configService = configService;
        this.awsService = awsService;
        this.onboardingService = onboardingService;
        this.auditService = auditService;
    }
    async register(dto) {
        const company = await this.db
            .insert(company_schema_1.companies)
            .values({
            name: dto.company_name,
            country: dto.country,
        })
            .returning({ id: company_schema_1.companies.id })
            .execute();
        const userExists = await this.findUserByEmail(dto.email.toLowerCase());
        if (userExists) {
            throw new common_1.BadRequestException('User already exists.');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const userData = {
            email: dto.email.toLowerCase(),
            password: hashedPassword,
            role: 'super_admin',
            company_id: company[0].id,
        };
        const newUser = await this.db.transaction(async (trx) => {
            const [user] = await trx
                .insert(users_schema_1.users)
                .values(userData)
                .returning({
                id: users_schema_1.users.id,
                email: users_schema_1.users.email,
            })
                .execute();
            await trx.insert(deductions_schema_1.taxConfig).values({
                apply_nhf: false,
                apply_pension: true,
                apply_paye: true,
                company_id: company[0].id,
            });
            await trx.insert(payroll_schema_1.salaryBreakdown).values({
                company_id: company[0].id,
                basic: '50.0',
                housing: '30.0',
                transport: '20.0',
            });
            await trx.insert(leave_attendance_schema_1.workHoursSettings).values({
                company_id: company[0].id,
                startTime: '09:00',
                endTime: '17:00',
                breakMinutes: 60,
                workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            });
            await trx.insert(leave_attendance_schema_1.attendanceRules).values({
                company_id: company[0].id,
            });
            return user;
        });
        await this.auditService.logAction(`Created ${dto.company_name}`, `Company`, newUser.id);
        await this.onboardingService.createOnboardingTasks(company[0].id);
        await this.verificationService.generateVerificationToken(newUser.id);
        return {
            user: newUser,
        };
    }
    async inviteUser(dto, company_id) {
        const company = await this.db
            .select({
            name: company_schema_1.companies.name,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        const token = this.jwtService.sign({
            email: dto.email,
            role: dto.role,
            company_id,
        });
        const inviteLink = `${this.configService.get('CLIENT_URL')}/auth/invite/${token}`;
        await this.invitation.sendInvitationEmail(dto.email, dto.name, company[0].name, dto.role, inviteLink);
    }
    async verifyInvite(token) {
        const decoded = await this.jwtService.verify(token);
        const { email, company_id, role } = decoded;
        let user = await this.findUserByEmail(email);
        if (!user) {
            const [newUser] = await this.db
                .insert(users_schema_1.users)
                .values({
                email: email,
                role: role,
                company_id: company_id,
                password: await bcrypt.hash('defaultPassword123', 10),
            })
                .returning()
                .execute();
            user = newUser;
        }
        else {
            await this.db
                .update(users_schema_1.users)
                .set({ role })
                .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, email))
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
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, email))
            .limit(1)
            .execute()
            .then((res) => res[0]);
    }
    async companyUsers(company_id) {
        const allUsers = await this.db
            .select({
            id: users_schema_1.users.id,
            email: users_schema_1.users.email,
            role: users_schema_1.users.role,
            first_name: users_schema_1.users.first_name,
            last_name: users_schema_1.users.last_name,
            avatar: users_schema_1.users.avatar,
        })
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(users_schema_1.users.company_id, company_id), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(users_schema_1.users.role, 'employee'))))
            .execute();
        if (allUsers.length === 0) {
            new common_1.BadRequestException('No users found for this company.');
        }
        return allUsers;
    }
    async editUserRole(user_id, dto) {
        await this.db
            .update(users_schema_1.users)
            .set({
            role: dto.role,
            first_name: dto.name,
        })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.id, user_id))
            .execute();
    }
    async getUserProfile(user_id) {
        const user = await this.db
            .select({
            id: users_schema_1.users.id,
            email: users_schema_1.users.email,
            role: users_schema_1.users.role,
            first_name: users_schema_1.users.first_name,
            last_name: users_schema_1.users.last_name,
            avatar: users_schema_1.users.avatar,
        })
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.id, user_id))
            .execute();
        if (user.length === 0) {
            new common_1.BadRequestException('User not found.');
        }
        return user[0];
    }
    async UpdateUserProfile(user_id, dto) {
        console.log('Updating user profile:', dto);
        const userAvatar = await this.awsService.uploadImageToS3(dto.email, 'avatar', dto.avatar);
        const updatedProfile = await this.db
            .update(users_schema_1.users)
            .set({
            first_name: dto.first_name,
            last_name: dto.last_name,
            avatar: userAvatar,
        })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.id, user_id))
            .returning({
            id: users_schema_1.users.id,
            email: users_schema_1.users.email,
            role: users_schema_1.users.role,
            first_name: users_schema_1.users.first_name,
            last_name: users_schema_1.users.last_name,
            avatar: users_schema_1.users.avatar,
        })
            .execute();
        return updatedProfile[0];
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, verification_service_1.VerificationService,
        invitation_service_1.InvitationService,
        jwt_1.JwtService,
        config_1.ConfigService,
        aws_service_1.AwsService,
        onboarding_service_1.OnboardingService,
        audit_service_1.AuditService])
], UserService);
//# sourceMappingURL=user.service.js.map